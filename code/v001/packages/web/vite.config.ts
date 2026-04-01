import { resolve } from "node:path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  cacheDir: ".vite",
  plugins: [preact()],
  resolve: {
    alias: {
      "@asimov/minimal-shared": resolve(__dirname, "../shared/src")
    }
  },
  optimizeDeps: {
    exclude: ["@asimov/minimal-shared"]
  },
  server: {
    proxy: {
      "/v1": "http://localhost:3001"
    },
    fs: {
      allow: [resolve(__dirname, "..")]
    },
    port: 8888
  }
});
