import type { Metadata } from "next";
import { PluginsClient } from "./_components/PluginsClient";

export const metadata: Metadata = {
  title: "Plugin Marketplace",
};

// Server Component shell — data fetching and interactivity delegated to PluginsClient
export default function PluginsPage() {
  return <PluginsClient />;
}
