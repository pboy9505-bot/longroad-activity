import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Discord serves your Activity through a proxy (…​.discordsays.com) reached over
// a tunnel in development. These settings make Vite's dev server work behind
// that tunnel and route /api calls to the token server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // allow the cloudflared/ngrok tunnel host to reach the dev server
    allowedHosts: true,
    // HMR over the HTTPS tunnel
    hmr: { clientPort: 443 },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
