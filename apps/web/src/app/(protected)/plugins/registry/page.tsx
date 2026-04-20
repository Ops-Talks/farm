import type { Metadata } from "next";
import { PluginRegistryBrowserClient } from "./_components/PluginRegistryBrowserClient";

export const metadata: Metadata = {
  title: "Plugin Registry",
};

export default function PluginRegistryPage() {
  return <PluginRegistryBrowserClient />;
}
