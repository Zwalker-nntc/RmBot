import { neon } from "@neondatabase/serverless"

const DISCORD_API = "https://discord.com/api/v10"
const SNOWFLAKE = /^\d{1,24}$/
let schemaPromise

function response(httpStatus, status, message, data = null) {
  return {
    httpStatus,
    body: { ok: httpStatus >= 200 && httpStatus < 300, status, data: data ?? { message } },
  }
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = Promise.all([
      sql`
        CREATE TABLE IF NOT EXISTS rmbot_dm_conversations (
          bot_user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          recipient_id TEXT NOT NULL,
          username TEXT NOT NULL,
          global_name TEXT,
          avatar TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (bot_user_id, channel_id, recipient_id)
        )
      `,
      sql`
        CREATE TABLE IF NOT EXISTS rmbot_dm_preferences (
          bot_user_id TEXT PRIMARY KEY,
          selected_dm_id TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `,
    ]).catch((error) => {
      schemaPromise = null
      throw error
    })
  }
  await schemaPromise
}

async function verifyBot(token) {
  let responseFromDiscord
  try {
    responseFromDiscord = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    throw new Error(`Could not verify the bot token with Discord: ${error.message}`)
  }

  if (!responseFromDiscord.ok) {
    const error = new Error(
      responseFromDiscord.status === 401
        ? "Discord rejected the bot token."
        : `Discord could not verify the bot token (HTTP ${responseFromDiscord.status}).`,
    )
    error.status = responseFromDiscord.status === 401 ? 401 : 502
    throw error
  }

  const bot = await responseFromDiscord.json()
  if (typeof bot.id !== "string" || !SNOWFLAKE.test(bot.id)) {
    throw new Error("Discord returned an invalid bot identity.")
  }
  return bot
}

function normalizeConversations(conversations) {
  if (!Array.isArray(conversations) || conversations.length > 500) {
    const error = new Error("DM conversation list must be an array of at most 500 entries.")
    error.status = 400
    throw error
  }

  return conversations.flatMap((conversation) => {
    if (!conversation || typeof conversation.id !== "string" || !SNOWFLAKE.test(conversation.id)) {
      const error = new Error("DM conversation contains an invalid channel ID.")
      error.status = 400
      throw error
    }
    if (!Array.isArray(conversation.recipients) || conversation.recipients.length > 20) {
      const error = new Error("DM conversation contains an invalid recipient list.")
      error.status = 400
      throw error
    }
    return conversation.recipients.map((recipient) => {
      if (!recipient || typeof recipient.id !== "string" || !SNOWFLAKE.test(recipient.id)) {
        const error = new Error("DM conversation contains an invalid recipient ID.")
        error.status = 400
        throw error
      }
      if (typeof recipient.username !== "string" || recipient.username.length > 100) {
        const error = new Error("DM conversation contains an invalid username.")
        error.status = 400
        throw error
      }
      return {
        channel_id: conversation.id,
        recipient_id: recipient.id,
        username: recipient.username,
        global_name: typeof recipient.global_name === "string" ? recipient.global_name.slice(0, 100) : null,
        avatar: typeof recipient.avatar === "string" ? recipient.avatar.slice(0, 128) : null,
      }
    })
  })
}

async function readSavedState(sql, botUserId) {
  const [recipients, preferences] = await Promise.all([
    sql`
      SELECT channel_id, recipient_id, username, global_name, avatar
      FROM rmbot_dm_conversations
      WHERE bot_user_id = ${botUserId}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT selected_dm_id
      FROM rmbot_dm_preferences
      WHERE bot_user_id = ${botUserId}
    `,
  ])
  const conversations = new Map()
  for (const recipient of recipients) {
    let conversation = conversations.get(recipient.channel_id)
    if (!conversation) {
      conversation = { id: recipient.channel_id, recipients: [] }
      conversations.set(recipient.channel_id, conversation)
    }
    conversation.recipients.push({
      id: recipient.recipient_id,
      username: recipient.username,
      global_name: recipient.global_name,
      avatar: recipient.avatar,
    })
  }
  return {
    conversations: Array.from(conversations.values()),
    selectedDmId: preferences[0]?.selected_dm_id || null,
  }
}

export async function handleDmConversations(payload = {}) {
  try {
    const { token, action } = payload
    if (typeof token !== "string" || !token.trim()) {
      return response(400, 400, "Missing bot token.")
    }
    if (!["load", "sync", "select"].includes(action)) {
      return response(400, 400, "Invalid DM storage action.")
    }
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!databaseUrl) {
      return response(503, 503, "Database is not configured. Link Neon to this project and set DATABASE_URL.")
    }

    const bot = await verifyBot(token)
    const sql = neon(databaseUrl)
    await ensureSchema(sql)

    if (action === "sync") {
      const recipients = normalizeConversations(payload.conversations)
      if (recipients.length > 0) {
        await sql`
          INSERT INTO rmbot_dm_conversations (
            bot_user_id, channel_id, recipient_id, username, global_name, avatar
          )
          SELECT
            ${bot.id}, entry.channel_id, entry.recipient_id, entry.username, entry.global_name, entry.avatar
          FROM jsonb_to_recordset(${JSON.stringify(recipients)}::jsonb) AS entry(
            channel_id TEXT,
            recipient_id TEXT,
            username TEXT,
            global_name TEXT,
            avatar TEXT
          )
          ON CONFLICT (bot_user_id, channel_id, recipient_id) DO UPDATE SET
            username = EXCLUDED.username,
            global_name = EXCLUDED.global_name,
            avatar = EXCLUDED.avatar
        `
      }
    }

    if (action === "select") {
      const selectedDmId = payload.selectedDmId
      if (selectedDmId !== null && (typeof selectedDmId !== "string" || !SNOWFLAKE.test(selectedDmId))) {
        return response(400, 400, "Invalid selected DM channel ID.")
      }
      if (selectedDmId !== null) {
        const matchingConversation = await sql`
          SELECT 1
          FROM rmbot_dm_conversations
          WHERE bot_user_id = ${bot.id} AND channel_id = ${selectedDmId}
          LIMIT 1
        `
        if (matchingConversation.length === 0) {
          return response(404, 404, "Selected DM is not saved for this bot.")
        }
      }

      await sql`
        INSERT INTO rmbot_dm_preferences (bot_user_id, selected_dm_id)
        VALUES (${bot.id}, ${selectedDmId})
        ON CONFLICT (bot_user_id) DO UPDATE SET
          selected_dm_id = EXCLUDED.selected_dm_id,
          updated_at = NOW()
      `
    }

    return response(200, 200, null, await readSavedState(sql, bot.id))
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500
    return response(status >= 400 && status <= 599 ? status : 500, status, error.message || "DM storage request failed.")
  }
}
