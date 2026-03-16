// Server Component — no "use client" needed here.
// Detail, editing, run history, and log streaming live in PipelineDetailClient.
import { PipelineDetailClient } from "./_components/PipelineDetailClient";

export default function PipelineDetailPage() {
  return <PipelineDetailClient />;
}
