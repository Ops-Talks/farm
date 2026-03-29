// Server Component — async params must be awaited in Next.js 15+.
// All interactive logic lives in IncidentDetailClient which is a Client Component.
import { IncidentDetailClient } from "./_components/IncidentDetailClient";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IncidentDetailClient id={id} />;
}
