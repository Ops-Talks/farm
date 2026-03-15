"use client";

import { Card, CardContent } from "@/components/ui/card";

export function TracesTab() {
  return (
    <Card className="h-[600px]">
      <CardContent className="p-0 h-full">
        <iframe
          src="http://localhost:3200"
          className="w-full h-full border-none rounded-md"
          title="Grafana Tempo"
        />
      </CardContent>
    </Card>
  );
}
