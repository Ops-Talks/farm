// Server Component — no "use client" needed here.
// All interactive logic (useParams, useRouter, useState, useEffect, data
// fetching, error state) lives in ComponentDetailClient which is a Client
// Component.
import { ComponentDetailClient } from "./_components/ComponentDetailClient";

export default function ComponentDetailPage() {
  return <ComponentDetailClient />;
}
