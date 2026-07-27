import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrgRole } from "@farm/types";
import { InvitationController } from "../invitation.controller";
import { InvitationService } from "../invitation.service";
import { OrgRolesGuard } from "../../../common/guards/org-roles.guard";

const mockReq = (userId = "u-1") =>
  ({ user: { userId, username: "admin", roles: ["admin"] } }) as never;

const makeToken = (overrides = {}) => ({
  id: "inv-1",
  token: "tok-abc",
  type: "org-invite" as const,
  email: "alice@example.com",
  orgId: "org-1",
  invitedBy: "u-1",
  role: OrgRole.MEMBER,
  message: null,
  status: "pending" as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86_400_000),
  acceptedAt: null,
  acceptedBy: null,
  ...overrides,
});

describe("InvitationController (Phase 37)", () => {
  let controller: InvitationController;
  let svc: jest.Mocked<InvitationService>;

  beforeEach(async () => {
    svc = {
      createInvitations: jest.fn(),
      listInvitations: jest.fn(),
      getPreview: jest.fn(),
      acceptInvitation: jest.fn(),
      resendInvitation: jest.fn(),
      revokeInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [{ provide: InvitationService, useValue: svc }],
    })
      .overrideGuard(OrgRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(InvitationController);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // POST /invitations
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("creates and returns invitation tokens", async () => {
      const tokens = [makeToken(), makeToken({ email: "bob@example.com" })];
      svc.createInvitations.mockResolvedValue(tokens);

      const dto = {
        organizationId: "org-1",
        emails: ["alice@example.com", "bob@example.com"],
        role: OrgRole.MEMBER,
      };
      const out = await controller.create(dto, mockReq());

      expect(svc.createInvitations).toHaveBeenCalledWith("u-1", dto);
      expect(out).toHaveLength(2);
    });

    it("propagates NotFoundException when org is missing", async () => {
      svc.createInvitations.mockRejectedValue(new NotFoundException());
      await expect(
        controller.create(
          { organizationId: "x", emails: ["a@b.com"], role: OrgRole.MEMBER },
          mockReq(),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /invitations
  // ---------------------------------------------------------------------------

  describe("list", () => {
    it("returns invitations using organizationId query param", async () => {
      const tokens = [makeToken()];
      svc.listInvitations.mockResolvedValue(tokens);

      const out = await controller.list("org-1");

      expect(svc.listInvitations).toHaveBeenCalledWith("org-1", undefined);
      expect(out).toHaveLength(1);
    });

    it("falls back to orgId alias when organizationId is empty", async () => {
      svc.listInvitations.mockResolvedValue([]);

      await controller.list("", "org-2", "pending");

      expect(svc.listInvitations).toHaveBeenCalledWith("org-2", "pending");
    });

    it("returns empty array when neither orgId param is provided", async () => {
      const out = await controller.list("", undefined);
      expect(svc.listInvitations).not.toHaveBeenCalled();
      expect(out).toEqual([]);
    });

    it("passes status filter to service", async () => {
      svc.listInvitations.mockResolvedValue([]);
      await controller.list("org-1", undefined, "accepted");
      expect(svc.listInvitations).toHaveBeenCalledWith("org-1", "accepted");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /invitations/by-token/:token
  // ---------------------------------------------------------------------------

  describe("preview", () => {
    it("returns a sanitized invitation preview", async () => {
      const preview = {
        orgName: "Acme",
        role: OrgRole.MEMBER,
        invitedByName: "Admin User",
        expiresAt: new Date(),
        message: null,
      };
      svc.getPreview.mockResolvedValue(preview);

      const out = await controller.preview("tok-abc");

      expect(svc.getPreview).toHaveBeenCalledWith("tok-abc");
      expect(out.orgName).toBe("Acme");
    });

    it("propagates NotFoundException for unknown tokens", async () => {
      svc.getPreview.mockRejectedValue(new NotFoundException());
      await expect(controller.preview("bad")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("propagates BadRequestException for expired tokens", async () => {
      svc.getPreview.mockRejectedValue(new BadRequestException("expired"));
      await expect(controller.preview("expired-tok")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /invitations/by-token/:token/accept
  // ---------------------------------------------------------------------------

  describe("accept", () => {
    it("returns organizationId, role, and userId on success", async () => {
      svc.acceptInvitation.mockResolvedValue({
        organizationId: "org-1",
        role: OrgRole.MEMBER,
        userId: "u-2",
      });

      const out = await controller.accept("tok-abc");

      expect(svc.acceptInvitation).toHaveBeenCalledWith("tok-abc");
      expect(out).toEqual({
        organizationId: "org-1",
        role: OrgRole.MEMBER,
        userId: "u-2",
      });
    });

    it("propagates BadRequestException for revoked invitation", async () => {
      svc.acceptInvitation.mockRejectedValue(
        new BadRequestException("revoked"),
      );
      await expect(controller.accept("revoked-tok")).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /invitations/:id/resend
  // ---------------------------------------------------------------------------

  describe("resend", () => {
    it("calls service with id and requesterId", async () => {
      const token = makeToken();
      svc.resendInvitation.mockResolvedValue(token);

      const out = await controller.resend("inv-1", mockReq());

      expect(svc.resendInvitation).toHaveBeenCalledWith("inv-1", "u-1");
      expect(out.id).toBe("inv-1");
    });

    it("propagates BadRequestException for non-pending invitation", async () => {
      svc.resendInvitation.mockRejectedValue(
        new BadRequestException("Only pending invitations can be resent"),
      );
      await expect(
        controller.resend("inv-1", mockReq()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /invitations/:id
  // ---------------------------------------------------------------------------

  describe("revoke", () => {
    it("revokes an invitation (no return value)", async () => {
      svc.revokeInvitation.mockResolvedValue(makeToken({ status: "revoked" }));

      await controller.revoke("inv-1", mockReq());

      expect(svc.revokeInvitation).toHaveBeenCalledWith("inv-1", "u-1");
    });

    it("propagates ForbiddenException when requester is not org admin", async () => {
      svc.revokeInvitation.mockRejectedValue(new ForbiddenException());
      await expect(
        controller.revoke("inv-1", mockReq()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("propagates BadRequestException for already-accepted invitation", async () => {
      svc.revokeInvitation.mockRejectedValue(
        new BadRequestException("Only pending invitations can be revoked"),
      );
      await expect(
        controller.revoke("inv-1", mockReq()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
