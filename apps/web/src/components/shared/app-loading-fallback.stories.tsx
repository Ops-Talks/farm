import type { Meta, StoryObj } from "@storybook/react";
import { AppLoadingFallback } from "@/components/shared/app-loading-fallback";

const meta: Meta<typeof AppLoadingFallback> = {
  title: "Shared/AppLoadingFallback",
  component: AppLoadingFallback,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof AppLoadingFallback>;

export const Default: Story = {
  name: "Default (Suspense fallback)",
};
