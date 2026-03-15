// Server Component — no "use client" needed here.
// All interactive logic (useParams, useRouter, useAuth, useState, useEffect,
// edit form, member management, CRUD operations) lives in TeamDetailClient
// which is a Client Component.
import { TeamDetailClient } from "./_components/TeamDetailClient";

export default function TeamDetailPage() {
  return <TeamDetailClient />;
}
