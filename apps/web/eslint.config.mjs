import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react@7.37.x calls context.getFilename() when version is
  // "detect", but that method was removed in ESLint 10. Pinning to the actual
  // React version in use bypasses the broken auto-detection code path.
  { settings: { react: { version: "19" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test coverage output — not application source
    "coverage/**",
    // Storybook build output
    "storybook-static/**",
  ]),
]);

export default eslintConfig;
