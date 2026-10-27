import { handleDmConversations } from "../server/dmConversations.js"

export default async function dmConversations(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      status: 405,
      data: { message: "Method not allowed" },
    })
  }

  const { httpStatus, body } = await handleDmConversations(req.body || {})
  return res.status(httpStatus).json(body)
}
