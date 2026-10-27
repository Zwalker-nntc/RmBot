# RMbotNet

Standalone Discord bot control panel. It does not need a hosted app-builder account or a third-party backend.

## Run locally

From this `RmBot` folder, run:

```sh
npm install
npm start
```

Open the local URL shown by Vite, usually `http://127.0.0.1:5173`, and enter a Discord bot token. From the parent project folder, `npm start` runs the same command after dependencies have been installed in `RmBot`.

The development server includes a local proxy for Discord API requests. Tokens stay in the browser session and are sent to the app's proxy, which forwards them to Discord. Your Discord bot needs access to the servers and channels you want to manage, and the relevant Discord intents enabled.

If local `npm start` reports a TLS certificate verification error when contacting Discord, Node.js cannot trust the certificate presented by the current network. Obtain the trusted root CA from your network administrator and set `NODE_EXTRA_CA_CERTS` to its PEM file before starting the app. Do not disable TLS verification. On Vercel, the serverless API uses Vercel's HTTPS trust store.

## Deploy to Vercel

Import the repository into Vercel and set **Root Directory** to `RmBot`. Vercel will build the Vite frontend (`npm run build`, output folder `dist`) and deploy the API handlers in `api/`. No external services or environment variables are needed.

Run `npm run lint` and `npm run typecheck` for checks.
