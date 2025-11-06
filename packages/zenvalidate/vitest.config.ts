import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    watch: false,
    env: {
      NODE_ENV: "test"
    },

    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
        "**/test-utils.ts",
        "**/__tests__/fixtures/**",
        "**/index.ts" // Exclude index files that just re-export
      ]
    },

    reporters: process.env.CI ? ["verbose"] : ["default"],

    include: ["src/**/*.test.{ts,tsx}"]
  }
});
