import type { StorybookConfig } from "@storybook/nextjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Storybook main configuration for the Farm web application.
 *
 * Framework: @storybook/nextjs (supports Next.js 14-16 + React 19)
 * Path alias "@/" is resolved to "src/" via webpackFinal to match tsconfig.json.
 * The @storybook/nextjs preset also applies TsconfigPathsPlugin automatically,
 * but the explicit alias below guarantees resolution in all cases.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (webpackConfig) => {
    if (webpackConfig.resolve) {
      webpackConfig.resolve.alias = {
        ...(webpackConfig.resolve.alias ?? {}),
        "@": path.resolve(__dirname, "../src"),
      };
    }
    return webpackConfig;
  },
};

export default config;
