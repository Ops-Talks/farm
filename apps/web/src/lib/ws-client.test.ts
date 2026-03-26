/**
 * Tests for the ws-client module.
 *
 * Covers: socket creation, authentication token handling, socket event
 * callbacks (connect / disconnect / connect_error), listener re-registration
 * on reconnect, subscribe / unsubscribe, disconnect(), and isConnected().
 *
 * Strategy: call disconnect() in beforeEach to reset the module-level
 * `socket` and `listeners` state between tests, then clear all mocks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock objects — vi.hoisted() ensures these are initialized before
// the vi.mock() factories run (which are hoisted to the top of the file).
// ---------------------------------------------------------------------------
const { mockOn, mockOff, mockSocketDisconnect, mockSocket, mockIo, mockGetAccessToken } =
  vi.hoisted(() => {
    const mockOn = vi.fn();
    const mockOff = vi.fn();
    const mockSocketDisconnect = vi.fn();

    // The same socket object is returned by every io() call; individual tests
    // toggle .connected to exercise different code branches.
    const mockSocket = {
      connected: true as boolean,
      id: "test-socket-id",
      on: mockOn,
      off: mockOff,
      disconnect: mockSocketDisconnect,
    };

    const mockIo = vi.fn(() => mockSocket);
    const mockGetAccessToken = vi.fn<[], string | null>(() => "test-token");

    return { mockOn, mockOff, mockSocketDisconnect, mockSocket, mockIo, mockGetAccessToken };
  });

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("socket.io-client", () => ({ io: mockIo }));

vi.mock("@/lib/api-client", () => ({
  getAccessToken: mockGetAccessToken,
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER the mocks are in place.
// ---------------------------------------------------------------------------
import { subscribe, disconnect, isConnected, FarmEvent } from "@/lib/ws-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the callback registered with mockOn for the given socket event.
 * Asserts that the callback exists before returning it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCapturedHandler(event: string): (...args: any[]) => void {
  const call = mockOn.mock.calls.find(([e]) => e === event);
  expect(call).toBeDefined();
  return call![1];
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ws-client", () => {
  beforeEach(() => {
    // 1. Tear down any socket state left by the previous test.
    //    disconnect() sets the module-level `socket = null` and calls
    //    listeners.clear(), giving every test a clean slate.
    disconnect();
    // 2. Wipe all call counts and mock implementations that were accumulated
    //    during the previous test AND by the disconnect() call above.
    vi.clearAllMocks();
    mockSocket.connected = true;
  });

  // -------------------------------------------------------------------------
  // subscribe — socket creation
  // -------------------------------------------------------------------------
  it("(1) creates a new socket via io() when subscribing for the first time", () => {
    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());

    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it("(2) calls io() with auth: undefined when getAccessToken returns null", () => {
    mockGetAccessToken.mockReturnValueOnce(null);

    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: undefined }),
    );
  });

  it("calls io() with auth: { token } when getAccessToken returns a token", () => {
    mockGetAccessToken.mockReturnValueOnce("bearer-jwt");

    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: "bearer-jwt" } }),
    );
  });

  it("(3) creates a new socket when the existing socket is disconnected", () => {
    // First subscribe — creates a socket.
    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    expect(mockIo).toHaveBeenCalledTimes(1);

    // Simulate the socket losing its connection.
    mockSocket.connected = false;
    vi.clearAllMocks();

    // Second subscribe — socket?.connected is false, so getSocket() must
    // call io() again.
    subscribe(FarmEvent.DEPLOYMENT_CREATED, vi.fn());

    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it("(4) reuses the existing listener Set when subscribing to the same event twice", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    subscribe(FarmEvent.COMPONENT_CREATED, handler1);
    vi.clearAllMocks(); // flush the first subscribe's mock calls

    // socket.connected is still true — no new socket should be created.
    subscribe(FarmEvent.COMPONENT_CREATED, handler2);

    expect(mockIo).not.toHaveBeenCalled();
    expect(mockOn).toHaveBeenCalledWith(FarmEvent.COMPONENT_CREATED, handler2);
  });

  // -------------------------------------------------------------------------
  // Unsubscribe
  // -------------------------------------------------------------------------
  it("(5) removes the handler and calls socket.off when unsubscribed", () => {
    const handler = vi.fn();
    const unsub = subscribe(FarmEvent.COMPONENT_UPDATED, handler);

    vi.clearAllMocks();
    unsub();

    expect(mockOff).toHaveBeenCalledWith(FarmEvent.COMPONENT_UPDATED, handler);
  });

  // -------------------------------------------------------------------------
  // Socket event callbacks
  // -------------------------------------------------------------------------
  it("(6) logs to console.log when the connect event fires", () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    getCapturedHandler("connect")();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Farm WS] Connected:"),
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });

  it("(7) logs to console.log when the disconnect event fires", () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    getCapturedHandler("disconnect")("io server disconnect");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Farm WS] Disconnected:"),
      "io server disconnect",
    );

    consoleSpy.mockRestore();
  });

  it("(8) warns to console.warn when the connect_error event fires", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    getCapturedHandler("connect_error")(new Error("ECONNREFUSED"));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Farm WS] Connection error:"),
      "ECONNREFUSED",
    );

    warnSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Listener re-registration on new socket
  // -------------------------------------------------------------------------
  it("(9) re-registers existing listeners when a disconnected socket is replaced", () => {
    const handler1 = vi.fn();
    // Subscribe to eventA — adds handler1 to the listeners Map and the socket.
    subscribe(FarmEvent.COMPONENT_CREATED, handler1);

    // Force the socket into a disconnected state.
    mockSocket.connected = false;
    vi.clearAllMocks();

    const handler2 = vi.fn();
    // Subscribing to eventB triggers getSocket() which sees the socket is
    // disconnected, calls io(), then re-registers all listeners from the Map
    // before returning.
    subscribe(FarmEvent.DEPLOYMENT_CREATED, handler2);

    // handler1 must have been re-registered on the new socket.
    expect(mockOn).toHaveBeenCalledWith(FarmEvent.COMPONENT_CREATED, handler1);
    // handler2 must also be registered.
    expect(mockOn).toHaveBeenCalledWith(FarmEvent.DEPLOYMENT_CREATED, handler2);
  });

  // -------------------------------------------------------------------------
  // disconnect()
  // -------------------------------------------------------------------------
  it("(10) calls socket.disconnect() and clears all listeners", () => {
    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    vi.clearAllMocks();

    disconnect();

    expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
  });

  it("(11) does not throw when disconnect() is called with no active socket", () => {
    // After beforeEach, socket is already null — this must be a silent no-op.
    expect(() => disconnect()).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // isConnected()
  // -------------------------------------------------------------------------
  it("(12) returns true when the socket is connected", () => {
    subscribe(FarmEvent.COMPONENT_CREATED, vi.fn());
    mockSocket.connected = true;

    expect(isConnected()).toBe(true);
  });

  it("(13) returns false when socket is null", () => {
    // beforeEach called disconnect(), so socket is null here.
    expect(isConnected()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // FarmEvent enum export
  // -------------------------------------------------------------------------
  it("exports FarmEvent with the expected event name values", () => {
    expect(FarmEvent.COMPONENT_CREATED).toBe("component.created");
    expect(FarmEvent.DEPLOYMENT_CREATED).toBe("deployment.created");
  });
});
