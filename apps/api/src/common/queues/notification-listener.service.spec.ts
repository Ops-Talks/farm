import { Queue } from "bullmq";
import { NotificationListenerService } from "./notification-listener.service";
import { NotificationJobData } from "./notification.processor";
import { DeploymentStatus } from "../../modules/environments/entities/deployment.entity";

const mockQueue = {
  add: jest.fn(),
};

describe("NotificationListenerService", () => {
  let service: NotificationListenerService;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    service = new NotificationListenerService(
      mockQueue as unknown as Queue<NotificationJobData>,
    );
    jest.clearAllMocks();
    // Ensure tests run outside of "test" mode to verify real logic
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
    });
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onTeamMemberAdded", () => {
    it("should enqueue a team-member-added email job", async () => {
      mockQueue.add.mockResolvedValue({ id: "job-1" });

      await service.onTeamMemberAdded({
        teamId: "team-uuid",
        teamName: "Platform Team",
        userId: "user-uuid",
        userEmail: "alice@example.com",
        username: "alice",
      });

      expect(mockQueue.add).toHaveBeenCalledWith("email", {
        type: "email",
        recipient: "alice@example.com",
        subject: "You have been added to team Platform Team",
        template: "team-member-added",
        payload: { teamName: "Platform Team", username: "alice" },
      });
    });

    it("should skip enqueue when userEmail is missing", async () => {
      await service.onTeamMemberAdded({
        teamId: "team-uuid",
        teamName: "Platform Team",
        userId: "user-uuid",
        username: "alice",
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should skip enqueue in test environment", async () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
      });

      await service.onTeamMemberAdded({
        teamId: "team-uuid",
        teamName: "Platform Team",
        userId: "user-uuid",
        userEmail: "alice@example.com",
        username: "alice",
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("onDeploymentStatusChanged", () => {
    it("should not enqueue when status is not FAILED", () => {
      service.onDeploymentStatusChanged({
        name: "user-service",
        status: DeploymentStatus.SUCCEEDED,
        environment: "production",
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should log and not enqueue when status is FAILED (no recipient configured)", () => {
      service.onDeploymentStatusChanged({
        name: "user-service",
        status: DeploymentStatus.FAILED,
        environment: "production",
        version: "1.0.0",
      });

      // No enqueue because recipient resolution is an extension point
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should skip in test environment", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
      });

      service.onDeploymentStatusChanged({
        name: "user-service",
        status: DeploymentStatus.FAILED,
        environment: "production",
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("onComponentCreated", () => {
    it("should log and not enqueue (owner email resolution is an extension point)", () => {
      service.onComponentCreated({
        id: "comp-uuid",
        name: "payment-service",
        kind: "service",
        owner: "platform-team",
      });

      // Owner email resolution is an extension point, no enqueue
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("should skip in test environment", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
      });

      service.onComponentCreated({
        name: "payment-service",
        kind: "service",
        owner: "platform-team",
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("without queue (no queue injected)", () => {
    it("should not throw when queue is not available", async () => {
      const serviceWithoutQueue = new NotificationListenerService(undefined);

      await expect(
        serviceWithoutQueue.onTeamMemberAdded({
          teamName: "Platform",
          userEmail: "user@example.com",
          username: "user",
        }),
      ).resolves.not.toThrow();
    });
  });
});
