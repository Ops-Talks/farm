// Server Component — no "use client" needed here.
// All interactive logic (useAuth, useState, useEffect, search, tab filter)
// lives in TeamsClient which is a Client Component.
import { TeamsClient } from "./_components/TeamsClient";

export default function TeamsPage() {
  return <TeamsClient />;
}
