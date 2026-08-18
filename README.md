# The Long Road — Discord Activity

A Pathfinder *Jade Regent* expedition game (Sandpoint → Minkai), packaged as a
**Discord Activity**: a real web app that runs inside Discord's voice/text
channels and DMs, on desktop, web, and mobile.

Your whole game — the parchment UI, the JRPG combat, the economy, the three
bosses — runs unchanged. This project just wraps it with Discord's Embedded App
SDK and a tiny token-exchange server.

---

## How it's structured

```
longroad-activity/
├── index.html            # Vite HTML shell
├── vite.config.js        # dev server, /api proxy, tunnel-friendly HMR
├── package.json
├── .env.example          # copy to .env and fill in
├── src/
│   ├── engine.js         # ← THE GAME (pure JavaScript, no React)
│   ├── App.jsx           # ← THE UI (React components, imports the engine)
│   ├── discordSdk.js     # Discord SDK setup + OAuth handshake
│   └── main.jsx          # entry point: connect to Discord, then render
└── server/
    └── server.js         # OAuth token exchange (uses the client SECRET)
```

The important design point: **`engine.js` is pure and framework-free.** The UI
imports it. That same engine could later drive a chat bot or any other
front-end without change.

---

## Prerequisites

- **Node.js 18+** (tested on 22).
- A **Discord account** and a server you can test in.
- A tunnel for local dev — [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
  is easiest (`brew install cloudflared`, or download the binary). ngrok works too.

---

## 1. Create the Discord application

1. Go to the **[Discord Developer Portal](https://discord.com/developers/applications)** → **New Application**.
2. On **OAuth2**, copy your **Client ID** and **Client Secret**.
3. On the **Activities** section (sometimes "Getting Started" / "Activities" in
   the left nav), **enable Activities** for the app.
4. Under **Activities → URL Mappings**, add a mapping:
   - **Prefix:** `/`  →  **Target:** *your tunnel or production host* (you'll get
     this URL in step 4; you can come back and fill it in).
   Mapping the root (`/`) covers both the client and the `/api/token` call, so
   you don't need a separate mapping for the backend.

> The game makes **no external network calls**, so you don't need Discord's
> `/.proxy/` URL-mapping dance for third-party domains — only the root mapping.

---

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_DISCORD_CLIENT_ID=your_application_client_id
DISCORD_CLIENT_SECRET=your_application_client_secret
PORT=3001
```

`VITE_DISCORD_CLIENT_ID` is public (the browser reads it). `DISCORD_CLIENT_SECRET`
is server-only and never ships to the client.

---

## 3. Install

```bash
npm install
```

---

## 4. Run it locally

You need three things running: the **client** (Vite), the **token server**, and
a **tunnel** so Discord can reach your machine over HTTPS.

```bash
npm run dev        # starts Vite (5173) AND the token server (3001) together
npm run tunnel     # in a SECOND terminal — prints an https://…​.trycloudflare.com URL
```

Then:

1. Copy the `https://…` URL that `cloudflared` printed.
2. Paste it as the **Target** of your `/` URL mapping in the Developer Portal
   (Activities → URL Mappings), and save.
3. In the Discord client, join a **voice channel** in your test server, open the
   **Activities** shelf (the rocket / controller icon), and launch your app.
   (During development you may need to add yourself under **App Testers**, and
   toggle the app's Activity entry point on.)

You can also just open `http://localhost:5173` in a **normal browser** to play
the game standalone — `discordSdk.js` detects it's not inside Discord and skips
the OAuth handshake, so you can iterate on the game without launching Discord
every time.

---

## 5. Deploy to production

1. Build the client:
   ```bash
   npm run build      # outputs dist/
   ```
2. Deploy `server/`, `dist/`, `package.json`, and your `.env` (as host env vars)
   to any Node host — Render, Railway, Fly.io, a VPS, etc. The server serves the
   built client from `dist/` **and** handles `/api/token`:
   ```bash
   npm start          # node server/server.js  (serves dist + /api/token)
   ```
3. Point your Developer-Portal **URL mapping** (`/` → …) at your production
   domain instead of the tunnel.

---

## Notes & next steps

- **No save/persistence yet.** Each launch starts a fresh journey. To persist a
  player's run across sessions, store the reducer state keyed by Discord user id
  (`auth.user.id`, available from `setupDiscord()`), e.g. in SQLite/Postgres or
  even a JSON file, and hydrate `useReducer`'s initial state from it.
- **Currently single-player** per client. Discord Activities can be multiplayer
  via the SDK's participant events and a shared authoritative state on the
  server; that's a larger design step, not required to ship.
- **Where the game lives:** all rules/tuning are in `src/engine.js`. All visuals
  are in `src/App.jsx`. They're cleanly separated, so you can rebalance the game
  without touching the UI and vice versa.
