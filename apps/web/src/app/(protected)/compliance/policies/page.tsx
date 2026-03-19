// Server Component wrapper for the Tag Policies management page.
import type { Metadata } from "next";
import { PolicyListClient } from "./_components/PolicyListClient";

export const metadata: Metadata = {
  title: "Tag Policies",
  description: "Manage resource tagging governance policies",
};

export default function PoliciesPage() {
  return <PolicyListClient />;
}
