// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, setInterval, WebSocket
// subscriptions) lives in QueuesClient which is a Client Component.
import { QueuesClient } from "./_components/QueuesClient";

export default function QueuesPage() {
  return <QueuesClient />;
}
