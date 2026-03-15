// Server Component — no "use client" needed here.
// All interactive logic (useParams, useState, useEffect, setInterval,
// job retry, expand/collapse) lives in QueueDetailClient which is a Client
// Component.
import { QueueDetailClient } from "./_components/QueueDetailClient";

export default function QueueDetailPage() {
  return <QueueDetailClient />;
}
