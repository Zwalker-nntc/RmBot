import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import { defineConfig, loadEnv } from "vite"
import { discordProxyMiddleware } from "./server/discordProxy.js"
import { dmConversationsMiddleware } from "./server/dmConversationsMiddleware.js"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "DATABASE_URL")
  if (!process.env.DATABASE_URL && env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL
  }

  return {
    plugins: [
      react(),
      {
        name: "discord-api",
        configureServer(server) {
          server.middlewares.use(discordProxyMiddleware())
          server.middlewares.use(dmConversationsMiddleware())
        },
      },
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: "127.0.0.1",
    },
  }
})
