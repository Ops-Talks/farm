// Server Component — no "use client" needed here.
// All interactive logic (useParams, pagination, timeline list) lives in
// IacStackRunsClient which is a Client Component.
import { IacStackRunsClient } from "./_components/IacStackRunsClient";

export default function IacStackRunsPage() {
  return <IacStackRunsClient />;
}
