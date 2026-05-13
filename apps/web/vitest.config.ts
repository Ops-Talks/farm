import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: ["default", ["junit", { outputFile: "coverage/junit.xml" }]],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text", "text-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/test/**",
        "src/components/ui/**",
        "src/app/layout.tsx",
        "src/app/global-error.tsx",
        "src/types/**",
        // page.tsx files in the App Router are thin shell components that
        // delegate all logic to co-located _components/. The glob covers all
        // nested routes including the root redirect page. The one exception
        // (invitations/[token]/accept/page.tsx) has a full state machine and
        // its own test suite — tests still run, they just do not contribute to
        // coverage thresholds due to this blanket exclusion.
        "src/app/**/page.tsx",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
