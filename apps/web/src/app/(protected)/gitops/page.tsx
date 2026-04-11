import { GitOpsClient } from "./_components/GitOpsClient";
import { FeatureGatePage } from "@/components/shared/feature-gate-page";

export default function GitOpsPage() {
  return (
    <FeatureGatePage feature="kubernetes" featureName="Kubernetes">
      <GitOpsClient />
    </FeatureGatePage>
  );
}
