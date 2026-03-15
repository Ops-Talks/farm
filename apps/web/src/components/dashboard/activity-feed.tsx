"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subscribe } from "@/lib/ws-client";
import { FarmEvent } from "@/types/api";
import type {
  ComponentEventPayload,
  DeploymentEventPayload,
} from "@/types/api";

interface ActivityItem {
  id: string;
  event: FarmEvent;
  label: string;
  resource: string;
  timestamp: string;
}

const MAX_ITEMS = 20;

function eventLabel(event: FarmEvent): string {
  switch (event) {
    case FarmEvent.COMPONENT_CREATED:
      return "Component created";
    case FarmEvent.COMPONENT_UPDATED:
      return "Component updated";
    case FarmEvent.COMPONENT_DELETED:
      return "Component deleted";
    case FarmEvent.DEPLOYMENT_CREATED:
      return "Deployment created";
    case FarmEvent.DEPLOYMENT_UPDATED:
      return "Deployment updated";
    default:
      return String(event);
  }
}

function eventVariant(event: FarmEvent): "default" | "secondary" | "destructive" {
  if (event === FarmEvent.COMPONENT_DELETED) return "destructive";
  if (
    event === FarmEvent.COMPONENT_CREATED ||
    event === FarmEvent.DEPLOYMENT_CREATED
  )
    return "default";
  return "secondary";
}

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

function isComponentPayload(
  event: FarmEvent,
  _payload: ComponentEventPayload | DeploymentEventPayload,
): _payload is ComponentEventPayload {
  return (
    event === FarmEvent.COMPONENT_CREATED ||
    event === FarmEvent.COMPONENT_UPDATED ||
    event === FarmEvent.COMPONENT_DELETED
  );
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const allEvents = [
      FarmEvent.COMPONENT_CREATED,
      FarmEvent.COMPONENT_UPDATED,
      FarmEvent.COMPONENT_DELETED,
      FarmEvent.DEPLOYMENT_CREATED,
      FarmEvent.DEPLOYMENT_UPDATED,
    ];

    for (const event of allEvents) {
      const unsub = subscribe(event, (payload) => {
        counterRef.current += 1;

        let resource: string;
        if (isComponentPayload(event, payload)) {
          resource = (payload as ComponentEventPayload).name;
        } else {
          const dp = payload as DeploymentEventPayload;
          resource = `${dp.version} (${dp.status})`;
        }

        const item: ActivityItem = {
          id: `${event}-${counterRef.current}`,
          event,
          label: eventLabel(event),
          resource,
          timestamp: payload.timestamp ?? new Date().toISOString(),
        };

        setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS));
      });

      unsubscribers.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recent activity. Events will appear here in real time as
            components and deployments change.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={eventVariant(item.event)} className="text-xs">
                      {item.label}
                    </Badge>
                    <span className="font-medium">{item.resource}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
