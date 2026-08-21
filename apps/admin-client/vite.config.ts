import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const apiTarget = "http://localhost:3000";

const proxyToApi = {
  target: apiTarget,
  changeOrigin: true,
  headers: { origin: apiTarget },
};

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,

    allowedHosts: [".ngrok-free.dev"],
    proxy: {
      "/trpc": proxyToApi,
      "/api/auth": proxyToApi,
      "/tickets": proxyToApi,
    },
  },
});
