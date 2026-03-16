// Server Component — no "use client" needed here.
// Create pipeline form logic lives in PipelineFormClient.
import { PipelineFormClient } from "./_components/PipelineFormClient";

export default function NewPipelinePage() {
  return <PipelineFormClient />;
}
