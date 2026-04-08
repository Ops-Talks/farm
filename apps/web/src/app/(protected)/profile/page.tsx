// Server Component — data fetching and interactive logic lives in client
// components (ProfileForm, ChangePasswordForm) following the same pattern
// used by CatalogPage, TeamsPage, etc.
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal information and account security."
      />

      {/* Personal Information */}
      <ProfileForm />

      {/* Security / Change Password */}
      <ChangePasswordForm />
    </div>
  );
}
