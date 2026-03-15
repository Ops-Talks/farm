"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = "/api";
const BULL_BOARD_URL = `${API_BASE.replace(/\/api$/, "")}/admin/queues`;

const queues = [
  {
    name: "catalog-discovery",
    description: "Processes catalog component ingestion from git repositories",
  },
  {
    name: "notifications",
    description: "Handles email and webhook notification delivery",
  },
];

export function QueuePanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Background Queues
          </CardTitle>
          <a
            href={BULL_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Open Bull Board
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queues.map((q) => (
            <div
              key={q.name}
              className="flex items-start justify-between gap-2"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{q.name}</span>
                <span className="text-xs text-muted-foreground">
                  {q.description}
                </span>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                BullMQ
              </Badge>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Queue metrics and job management available via Bull Board when Redis is
          connected.
        </p>
      </CardContent>
    </Card>
  );
}
