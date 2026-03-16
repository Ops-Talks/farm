// Server Component — no "use client" directive needed.
// All data-fetching and interactivity lives in OrgsClient (Client Component).
import { OrgsClient } from "./_components/OrgsClient";

export const metadata = {
  title: "Organizations",
};

export default function OrganizationsPage() {
  return <OrgsClient />;
}
