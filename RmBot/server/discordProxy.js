const DISCORD_API = "https://discord.com/api/v10"
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])
const MAX_BODY_BYTES = 4 * 1024 * 1024
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

function describeError(error) {
  const messages = []
  let current = error
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current.message === "string" && current.message && !messages.includes(current.message)) {
      messages.push(current.message)
    }
    current = current.cause
  }

  let message = messages.join(": ") || "Discord request failed"
  const code = error?.cause?.code || error?.code
  if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "SELF_SIGNED_CERT_IN_CHAIN") {
    message += ". Node.js cannot verify the HTTPS certificate presented on this network. Configure the trusted CA with NODE_EXTRA_CA_CERTS, or try deploying to Vercel. TLS verification must remain enabled."
  }
  return message
}

function discordUrl(path, query) {
  if (typeof path !== "string" || !path.trim()) {
    const error = new Error("Missing Discord API path")
    error.status = 400
    throw error
  }

  const cleanPath = path.replace(/^\/+/, "")
  if (cleanPath.includes("..") || cleanPath.includes("://")) {
    const error = new Error("Invalid Discord API path")
    error.status = 400
    throw error
  }

  const url = new URL(`${DISCORD_API}/${cleanPath}`)
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.append(key, String(value))
    }
  }
  return url
}

function createMultipartBody(body, file) {
  const allowedMedia = ["image/", "video/", "audio/"]
  const maximumEncodedSize = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4
  if (
    !file ||
    typeof file.name !== "string" ||
    !file.name.trim() ||
    file.name.length > 255 ||
    typeof file.type !== "string" ||
    !allowedMedia.some((type) => file.type.startsWith(type)) ||
    typeof file.data !== "string" ||
    file.data.length === 0 ||
    file.data.length > maximumEncodedSize ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)
  ) {
    const error = new Error("Invalid media upload. Choose an image, video, or audio file up to 2 MB.")
    error.status = 400
    throw error
  }

  const bytes = Buffer.from(file.data, "base64")
  if (bytes.length > MAX_UPLOAD_BYTES || bytes.toString("base64") !== file.data) {
    const error = new Error("Media uploads must be 2 MB or smaller.")
    error.status = 413
    throw error
  }

  const form = new FormData()
  const message = body.message || body
  form.append(
    "payload_json",
    JSON.stringify({
      ...body,
      ...(body.message
        ? {
            message: {
              ...body.message,
              attachments: [...(body.message.attachments || []), { id: 0, filename: file.name }],
            },
          }
        : { attachments: [...(message.attachments || []), { id: 0, filename: file.name }] }),
    }),
  )
  form.append("files[0]", new Blob([bytes], { type: file.type }), file.name)
  return form
}

async function discordRequest(token, method, path, { body, query, file } = {}) {
  const options = {
    method,
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(20000),
  }
  if (file) {
    options.body = createMultipartBody(body || {}, file)
  } else if (body !== undefined && body !== null && ["POST", "PUT", "PATCH"].includes(method)) {
    options.headers["Content-Type"] = "application/json"
    options.body = JSON.stringify(body)
  }

  const url = discordUrl(path, query)
  let response = await fetch(url, options)
  if (response.status === 429) {
    const rateLimit = await response.json().catch(() => ({}))
    const wait = Math.min((Number(rateLimit.retry_after) || 1) * 1000 + 300, 5000)
    await new Promise((resolve) => setTimeout(resolve, wait))
    response = await fetch(url, options)
  }

  if (response.status === 204) return { ok: true, status: 204, data: null }
  const text = await response.text()
  let data = text
  if ((response.headers.get("content-type") || "").includes("application/json") && text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    data,
  }
}

async function listDmTargets(token) {
  const guilds = await discordRequest(token, "GET", "users/@me/guilds")
  if (!guilds.ok) return guilds
  if (!Array.isArray(guilds.data)) return { ok: true, status: 200, data: { users: [] } }

  const users = new Map()
  for (let index = 0; index < guilds.data.length; index += 6) {
    const batch = guilds.data.slice(index, index + 6)
    const results = await Promise.allSettled(
      batch.map((guild) =>
        discordRequest(token, "GET", `guilds/${guild.id}/members`, { query: { limit: 1000 } }),
      ),
    )
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.ok || !Array.isArray(result.value.data)) continue
      for (const member of result.value.data) {
        if (member.user && !member.user.bot && !users.has(member.user.id)) {
          users.set(member.user.id, {
            id: member.user.id,
            username: member.user.username,
            global_name: member.user.global_name || null,
            avatar: member.user.avatar || null,
          })
        }
      }
    }
  }
  return { ok: true, status: 200, data: { users: Array.from(users.values()) } }
}

export async function handleDiscordProxy(endpoint, payload = {}) {
  const { token, method = "GET", path, body, query, file } = payload
  if (typeof token !== "string" || !token.trim()) {
    return { httpStatus: 200, body: { ok: false, status: 400, data: { message: "Missing bot token" } } }
  }

  try {
    if (endpoint === "discordListDmTargets") {
      return { httpStatus: 200, body: await listDmTargets(token) }
    }
    if (endpoint !== "discordApi") {
      return { httpStatus: 404, body: { ok: false, status: 404, data: { message: "Unknown API endpoint" } } }
    }

    const normalizedMethod = String(method).toUpperCase()
    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      return {
        httpStatus: 200,
        body: { ok: false, status: 400, data: { message: "Method not allowed" } },
      }
    }
    return {
      httpStatus: 200,
      body: await discordRequest(token, normalizedMethod, path, { body, query, file }),
    }
  } catch (error) {
    return {
      httpStatus: error.status === 413 ? 413 : 200,
      body: {
        ok: false,
        status: error.status || 500,
        data: { message: describeError(error) },
      },
    }
  }
}

export async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large")
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    const error = new Error("Invalid JSON request body")
    error.status = 400
    throw error
  }
}

export function discordProxyMiddleware() {
  return async (req, res, next) => {
    const pathname = new URL(req.url, "http://localhost").pathname
    if (pathname !== "/api/discordApi" && pathname !== "/api/discordListDmTargets") {
      next()
      return
    }
    if (req.method !== "POST") {
      res.statusCode = 405
      res.end(JSON.stringify({ ok: false, status: 405, data: { message: "Method not allowed" } }))
      return
    }

    try {
      const payload = await readJsonBody(req)
      const endpoint = pathname === "/api/discordListDmTargets" ? "discordListDmTargets" : "discordApi"
      const result = await handleDiscordProxy(endpoint, payload)
      res.statusCode = result.httpStatus
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.end(JSON.stringify(result.body))
    } catch (error) {
      res.statusCode = error.status === 413 ? 413 : 400
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.end(JSON.stringify({
        ok: false,
        status: error.status || 400,
        data: { message: error.message || "Invalid request" },
      }))
    }
  }
}
