// Server Component — no "use client" needed here.
// All interactive logic lives in EnvironmentsClient which is a Client Component.
import { EnvironmentsClient } from "./_components/EnvironmentsClient";

export const metadata = {
  title: "Environments",
};

export default function EnvironmentsPage() {
  return <EnvironmentsClient />;
}
