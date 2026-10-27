import { handleDiscordProxy } from "../server/discordProxy.js"

export default async function discordListDmTargets(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      status: 405,
      data: { message: "Method not allowed" },
    })
  }

  const { httpStatus, body } = await handleDiscordProxy("discordListDmTargets", req.body || {})
  return res.status(httpStatus).json(body)
}
