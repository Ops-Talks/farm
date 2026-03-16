// Server Component shell — all data loading is done client-side in OrgDetailClient
// so that we can leverage the auth token from sessionStorage.
import { OrgDetailClient } from "./_components/OrgDetailClient";

export const metadata = {
  title: "Organization Settings",
};

export default function OrganizationDetailPage() {
  return <OrgDetailClient />;
}
