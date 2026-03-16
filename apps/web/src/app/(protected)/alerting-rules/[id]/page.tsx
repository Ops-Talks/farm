import { AlertingRuleDetailClient } from "./_components/AlertingRuleDetailClient";

export const metadata = {
  title: "Edit Alerting Rule",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AlertingRuleDetailPage({ params }: Props) {
  const { id } = await params;
  return <AlertingRuleDetailClient id={id} />;
}
