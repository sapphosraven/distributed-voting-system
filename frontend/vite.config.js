import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:5001", // changed to https
        changeOrigin: true,
        secure: false, // allow self-signed certs
        ws: true,
      },
    },
  },
});
