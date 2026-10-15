import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const SERVER_PORT = process.env.LIFEHUB_PORT ?? "3131";
const CLIENT_PORT = Number(process.env.LIFEHUB_CLIENT_PORT ?? "5173");

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "src/shared"),
      "@client": path.resolve(import.meta.dirname, "src/client"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: CLIENT_PORT,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${SERVER_PORT}`,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
