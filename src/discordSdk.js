// Discord Embedded App SDK wiring.
//
// Inside Discord, an Activity runs in an iframe and Discord passes a `frame_id`
// query param. We use that to detect the environment: if we're inside Discord
// we run the full OAuth handshake; if we're just in a normal browser (handy for
// local development), we skip Discord entirely and run the game standalone.

import { DiscordSDK } from "@discord/embedded-app-sdk";

export let discordSdk = null;
export let runningInDiscord = false;

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

export async function setupDiscord() {
  const params = new URLSearchParams(window.location.search);
  runningInDiscord = params.has("frame_id");

  // Standalone browser (dev): don't touch Discord at all.
  if (!runningInDiscord) {
    return { runningInDiscord: false, user: null };
  }
  if (!CLIENT_ID) {
    console.warn("VITE_DISCORD_CLIENT_ID is not set — cannot authenticate with Discord.");
    return { runningInDiscord: true, user: null };
  }

  discordSdk = new DiscordSDK(CLIENT_ID);

  // 1) Wait for the Discord client to be ready.
  await discordSdk.ready();

  // 2) Pop the OAuth consent and get an authorization code.
  const { code } = await discordSdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"],
  });

  // 3) Exchange the code for an access token via our own backend
  //    (the client secret must never live in the browser).
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Token exchange failed: " + res.status);
  const { access_token } = await res.json();

  // 4) Authenticate the SDK with the token.
  const auth = await discordSdk.commands.authenticate({ access_token });
  if (!auth) throw new Error("authenticate() returned null");

  return { runningInDiscord: true, user: auth.user ?? null, auth };
}
