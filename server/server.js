// Minimal backend for the Discord Activity.
//
// Its one essential job is the OAuth token exchange: the browser sends the
// authorization code here, and we swap it for an access token using the client
// SECRET, which must never be exposed to the client. In production this same
// server also serves the built client (../dist).

import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
// The client id can be public; the browser build reads VITE_DISCORD_CLIENT_ID,
// but the server accepts either name so you only have to set it once.
const CLIENT_ID = process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

app.post("/api/token", async (req, res) => {
  try {
    const { code } = req.body ?? {};
    if (!code) return res.status(400).json({ error: "missing code" });
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(500).json({ error: "server missing CLIENT_ID/CLIENT_SECRET" });
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Discord token error:", data);
      return res.status(response.status).json(data);
    }
    // Only hand the browser what it needs.
    return res.json({ access_token: data.access_token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "token exchange failed" });
  }
});

// In production, serve the built client from ../dist.
const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Long Road server listening on http://localhost:${PORT}`);
});
