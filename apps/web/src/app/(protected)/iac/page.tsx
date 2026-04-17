// Server Component — no "use client" needed here.
// All interactive logic (tabs, data fetching, module drift table) lives in
// IacDashboardClient which is a Client Component.
import { IacDashboardClient } from "./_components/IacDashboardClient";

export const metadata = {
  title: "IaC Overview",
};

export default function IacPage() {
  return <IacDashboardClient />;
}
