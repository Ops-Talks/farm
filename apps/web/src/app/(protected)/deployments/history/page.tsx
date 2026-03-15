// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, pagination, status filter)
// lives in DeploymentHistoryClient which is a Client Component.
import { DeploymentHistoryClient } from "./_components/DeploymentHistoryClient";

export default function DeploymentHistoryPage() {
  return <DeploymentHistoryClient />;
}
