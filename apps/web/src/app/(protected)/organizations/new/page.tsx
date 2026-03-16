// Server Component shell — wraps the interactive form Client Component.
import { NewOrgClient } from "./_components/NewOrgClient";

export const metadata = {
  title: "Create Organization",
};

export default function NewOrganizationPage() {
  return <NewOrgClient />;
}
