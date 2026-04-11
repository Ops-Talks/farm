import { OperatorsClient } from "./_components/OperatorsClient";
import { FeatureGatePage } from "@/components/shared/feature-gate-page";

export default function OperatorsPage() {
  return (
    <FeatureGatePage feature="kubernetes" featureName="Kubernetes">
      <OperatorsClient />
    </FeatureGatePage>
  );
}
