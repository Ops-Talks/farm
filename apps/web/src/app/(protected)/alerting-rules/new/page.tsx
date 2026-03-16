import { PageHeader } from "@/components/shared/page-header";
import { AlertingRuleFormClient } from "../_components/AlertingRuleFormClient";

export const metadata = {
  title: "Create Alerting Rule",
};

export default function NewAlertingRulePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create Alerting Rule"
        description="Define a new PromQL-based alerting rule."
      />
      <AlertingRuleFormClient />
    </div>
  );
}
