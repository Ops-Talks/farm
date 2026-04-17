// Server Component — all interactive logic lives in IacStacksListClient.
import { IacStacksListClient } from "./_components/IacStacksListClient";

export const metadata = {
  title: "IaC Stacks",
};

export default function IacStacksPage() {
  return <IacStacksListClient />;
}
