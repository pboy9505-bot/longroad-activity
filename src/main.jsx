import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { setupDiscord } from "./discordSdk.js";

const root = createRoot(document.getElementById("root"));

// Try to connect to Discord; whether or not that succeeds (e.g. running in a
// plain browser during development), render the game.
setupDiscord()
  .then((info) => {
    if (info.runningInDiscord) {
      console.log("Running as a Discord Activity", info.user ? `for ${info.user.username}` : "");
    } else {
      console.log("Running standalone (not inside Discord).");
    }
  })
  .catch((err) => {
    console.error("Discord setup failed — running the game anyway:", err);
  })
  .finally(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
