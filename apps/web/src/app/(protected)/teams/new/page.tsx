// Server Component — no "use client" needed here.
// All interactive logic (useState, useRouter, form submission)
// lives in NewTeamClient which is a Client Component.
import { NewTeamClient } from "./_components/NewTeamClient";

export default function NewTeamPage() {
  return <NewTeamClient />;
}
