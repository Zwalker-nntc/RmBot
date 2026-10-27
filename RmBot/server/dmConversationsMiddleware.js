import { handleDmConversations } from "./dmConversations.js"
import { readJsonBody } from "./discordProxy.js"

export function dmConversationsMiddleware() {
  return async (req, res, next) => {
    const pathname = new URL(req.url, "http://localhost").pathname
    if (pathname !== "/api/dmConversations") {
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
      const result = await handleDmConversations(payload)
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
