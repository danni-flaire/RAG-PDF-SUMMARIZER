import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backendTarget = process.env.VITE_BACKEND_TARGET || "http://localhost:8000";

const proxy = {
  // Proxy the API so the browser only ever talks to the Vite origin.
  // This works identically on localhost, 127.0.0.1, and LAN/tunnel hosts,
  // which the backend's fixed CORS allowlist does not cover.
  "/api": {
    target: backendTarget,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
});