import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockDisconnect = vi.fn();
const mockSocket = { connected: true, id: "test-socket", on: mockOn, off: mockOff, disconnect: mockDisconnect };
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock("@/lib/api-client", () => ({
  getAccessToken: vi.fn(() => "test-token"),
}));

import { subscribe, isConnected, FarmEvent } from "@/lib/ws-client";

describe("ws-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
  });

  it("should subscribe to events", () => {
    const handler = vi.fn();
    const unsub = subscribe(FarmEvent.COMPONENT_CREATED, handler);
    expect(mockOn).toHaveBeenCalledWith(FarmEvent.COMPONENT_CREATED, handler);
    expect(typeof unsub).toBe("function");
  });

  it("should unsubscribe from events", () => {
    const handler = vi.fn();
    const unsub = subscribe(FarmEvent.COMPONENT_UPDATED, handler);
    unsub();
    expect(mockOff).toHaveBeenCalledWith(FarmEvent.COMPONENT_UPDATED, handler);
  });

  it("should report connected state", () => {
    expect(isConnected()).toBe(true);
  });

  it("should export FarmEvent enum", () => {
    expect(FarmEvent.COMPONENT_CREATED).toBe("component.created");
    expect(FarmEvent.DEPLOYMENT_CREATED).toBe("deployment.created");
  });
});
