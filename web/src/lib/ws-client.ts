import { io, Socket } from "socket.io-client";
import { FarmEvent } from "@/types/api";
import type { ComponentEventPayload, DeploymentEventPayload } from "@/types/api";
import { getAccessToken } from "@/lib/api-client";

type FarmEventPayload = ComponentEventPayload | DeploymentEventPayload;
type EventHandler = (payload: FarmEventPayload) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "/events";

let socket: Socket | null = null;
const listeners = new Map<string, Set<EventHandler>>();

function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();

  socket = io(WS_URL, {
    auth: token ? { token } : undefined,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[Farm WS] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Farm WS] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[Farm WS] Connection error:", error.message);
  });

  // Re-register all active listeners on new socket
  for (const [event, handlers] of listeners.entries()) {
    for (const handler of handlers) {
      socket.on(event, handler);
    }
  }

  return socket;
}

export function subscribe(event: FarmEvent, handler: EventHandler): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);

  const s = getSocket();
  s.on(event, handler);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(handler);
    s.off(event, handler);
  };
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}

export { FarmEvent };
