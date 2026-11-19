import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, si no defines VITE_API_URL, Vite reenvía /api a VITE_PROXY_TARGET
// (por defecto http://localhost:3000). Así no hay problemas de CORS al desarrollar.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prefix = `/${(env.VITE_API_PREFIX || "api").replace(/^\/+|\/+$/g, "")}`;

  return {
    plugins: [react()],
    css: { postcss: { plugins: [] } },
    server: {
      port: 5173,
      proxy: env.VITE_API_URL
        ? undefined
        : { [prefix]: { target: env.VITE_PROXY_TARGET || "http://localhost:3000", changeOrigin: true } },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.js"],
    },
  };
});
