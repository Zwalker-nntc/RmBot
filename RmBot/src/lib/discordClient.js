const KEY = "rmbotnet_token";
let _token = null;

class DiscordClientError extends Error {
  constructor(message, status, discordData) {
    super(message)
    this.name = "DiscordClientError"
    this.status = status
    this.discordData = discordData
  }
}

export function setToken(t) {
  _token = t || null;
  if (t) sessionStorage.setItem(KEY, t);
  else sessionStorage.removeItem(KEY);
}
export function getToken() {
  if (_token) return _token;
  _token = sessionStorage.getItem(KEY);
  return _token;
}
export function clearToken() {
  _token = null;
  sessionStorage.removeItem(KEY);
}

async function proxyRequest(endpoint, payload) {
  let response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new DiscordClientError(
      `Could not reach the local Discord API proxy: ${error.message}`,
      0,
    )
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new DiscordClientError(
      `The Discord API proxy returned an invalid response (HTTP ${response.status}). Check that the app server is running and the /api route is available.`,
      response.status,
    )
  }

  if (!response.ok && result?.ok !== false) {
    throw new DiscordClientError(
      result?.data?.message || `Discord API proxy request failed (HTTP ${response.status})`,
      response.status,
      result?.data,
    )
  }
  return { response, result }
}

async function request(method, path, opts = {}) {
  const token = getToken();
  if (!token) {
    throw new DiscordClientError("No bot token set", 401)
  }
  const { result } = await proxyRequest("/api/discordApi", {
      token,
      method,
      path,
      body: opts.body,
      query: opts.query,
  })
  if (!result || result.ok === false) {
    const raw = result && result.data && (result.data.message || result.data);
    throw new DiscordClientError(
      typeof raw === "string" ? raw : "Discord request failed",
      result && result.status,
      result && result.data,
    )
  }
  return result.data;
}

export const discord = {
  request,
  getMe: () => request("GET", "users/@me"),
  getGuilds: () => request("GET", "users/@me/guilds"),
  getChannels: (gid) => request("GET", `guilds/${gid}/channels`),
  getMessages: (cid, limit = 50, before) =>
    request("GET", `channels/${cid}/messages`, { query: { limit, ...(before ? { before } : {}) } }),
  sendMessage: (cid, content) => request("POST", `channels/${cid}/messages`, { body: { content } }),
  addReaction: (cid, mid, emoji) =>
    request("PUT", `channels/${cid}/messages/${mid}/reactions/${encodeURIComponent(emoji)}/@me`),
  removeReaction: (cid, mid, emoji) =>
    request("DELETE", `channels/${cid}/messages/${mid}/reactions/${encodeURIComponent(emoji)}/@me`),
  deleteMessage: (cid, mid) => request("DELETE", `channels/${cid}/messages/${mid}`),
  editMessage: (cid, mid, content) =>
    request("PATCH", `channels/${cid}/messages/${mid}`, { body: { content } }),
  triggerTyping: (cid) => request("POST", `channels/${cid}/typing`),
  getDms: () => request("GET", "users/@me/channels"),
  createDm: (recipientId) => request("POST", "users/@me/channels", { body: { recipient_id: recipientId } }),
  async getDmTargets() {
    const { response, result } = await proxyRequest("/api/discordListDmTargets", { token: getToken() })
    if (!result || result.ok === false) {
      const raw = result?.data?.message || result?.data || "Failed to load DM targets"
      throw new DiscordClientError(
        typeof raw === "string" ? raw : "Failed to load DM targets",
        result?.status || response.status,
        result?.data,
      )
    }
    return result.data?.users || []
  },
};

export function userAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  return null;
}

export function guildIconUrl(guild) {
  if (!guild || !guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
}

export function defaultAvatarColor(id) {
  const colors = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}