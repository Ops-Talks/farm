"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureAvailability } from "@/contexts/feature-availability-context";

const FEATURES = [
  { key: "kubernetes" as const, label: "Kubernetes" },
  { key: "cost" as const, label: "OpenCost" },
  { key: "registry" as const, label: "Container Registry" },
  { key: "helm" as const, label: "Helm" },
  { key: "istio" as const, label: "Istio" },
] as const;

export function IntegrationHealthCard() {
  const availability = useFeatureAvailability();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Integration Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {FEATURES.map(({ key, label }) => {
            const configured = availability[key];
            return (
              <div key={key} className="flex items-center gap-2">
                {configured ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={`text-sm ${configured ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
