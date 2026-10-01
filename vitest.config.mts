import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // El motor de ELIZA es TypeScript puro: no necesita DOM.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
