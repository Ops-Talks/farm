import { IntegrationSettingsClient } from "./_components/IntegrationSettingsClient";

export const metadata = {
  title: "Integration Settings",
  description: "Connect external CI/CD tools to Farm",
};

export default function IntegrationSettingsPage() {
  return <IntegrationSettingsClient />;
}
