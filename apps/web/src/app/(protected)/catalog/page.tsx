// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, WebSocket subscriptions,
// pagination, search) lives in CatalogClient which is a Client Component.
import { CatalogClient } from "./_components/CatalogClient";

export default function CatalogPage() {
  return <CatalogClient />;
}
