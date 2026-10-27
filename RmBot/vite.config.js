import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import { discordProxyMiddleware } from "./server/discordProxy.js"
import { dmConversationsMiddleware } from "./server/dmConversationsMiddleware.js"

export default defineConfig({
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
})
