// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, WebSocket subscriptions,
// tab filtering) lives in DeploymentMatrixClient which is a Client Component.
import { DeploymentMatrixClient } from "./_components/DeploymentMatrixClient";

export default function DeploymentsPage() {
  return <DeploymentMatrixClient />;
}
