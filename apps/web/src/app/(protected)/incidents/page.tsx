// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, data fetching, navigation)
// lives in IncidentsClient which is a Client Component.
import { IncidentsClient } from "./_components/IncidentsClient";

export default function IncidentsPage() {
  return <IncidentsClient />;
}
