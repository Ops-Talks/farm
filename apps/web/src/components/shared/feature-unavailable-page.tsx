import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureUnavailablePageProps {
  featureName: string;
  configPath?: string;
  configLabel?: string;
}

export function FeatureUnavailablePage({
  featureName,
  configPath = "/integrations/settings",
  configLabel = "Integration Settings",
}: FeatureUnavailablePageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{featureName} is not configured</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This feature requires additional configuration before it can be used.
        </p>
      </div>
      <Link href={configPath} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        {configLabel}
      </Link>
    </div>
  );
}
