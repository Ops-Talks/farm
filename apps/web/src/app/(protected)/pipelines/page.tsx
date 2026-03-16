// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, API calls, trigger actions)
// lives in PipelinesClient which is a Client Component.
import { PipelinesClient } from "./_components/PipelinesClient";

export default function PipelinesPage() {
  return <PipelinesClient />;
}
