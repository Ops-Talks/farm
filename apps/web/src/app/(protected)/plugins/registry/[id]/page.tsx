import type { Metadata } from "next";
import { PluginRegistryDetailClient } from "./_components/PluginRegistryDetailClient";

export const metadata: Metadata = {
  title: "Plugin Details",
};

export default function PluginRegistryDetailPage() {
  return <PluginRegistryDetailClient />;
}
