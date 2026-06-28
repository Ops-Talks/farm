import { Test, TestingModule } from "@nestjs/testing";
import { Request as ExpressRequest } from "express";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InvitationsController } from "../invitations.controller";
import { OrganizationService } from "../organization.service";
import { MemberResponseDto } from "../dto/member-response.dto";
import { OrgRole } from "@farm/types";

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    username: string;
    roles: string[];
  };
}

describe("InvitationsController", () => {
  let controller: InvitationsController;
  let service: OrganizationService;

  const mockMember: MemberResponseDto = {
    userId: "user-uuid-1",
    username: "acceptor_user",
    email: "acceptor@example.com",
    role: OrgRole.MEMBER,
    joinedAt: new Date("2024-01-01"),
  };

  const mockRequest = {
    user: { userId: "user-uuid-1", username: "acceptor_user", roles: [] },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: OrganizationService,
          useValue: {
            acceptInvitation: jest.fn().mockResolvedValue(mockMember),
          },
        },
      ],
    })
      .compile();

    controller = module.get<InvitationsController>(InvitationsController);
    service = module.get<OrganizationService>(OrganizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // acceptInvitation
  // ---------------------------------------------------------------------------

  describe("acceptInvitation", () => {
    it("should call service.acceptInvitation and return MemberResponseDto", async () => {
      const result = await controller.acceptInvitation(
        "valid-token-abc",
        mockRequest,
      );

      expect(result).toEqual(mockMember);
      expect(service.acceptInvitation).toHaveBeenCalledWith(
        "valid-token-abc",
        "user-uuid-1",
      );
    });

    it("should forward the caller's userId to the service", async () => {
      const otherRequest = {
        user: { userId: "other-user-uuid", username: "other", roles: [] },
      } as unknown as AuthenticatedRequest;

      await controller.acceptInvitation("some-token", otherRequest);

      expect(service.acceptInvitation).toHaveBeenCalledWith(
        "some-token",
        "other-user-uuid",
      );
    });

    it("should propagate NotFoundException for invalid tokens", async () => {
      (service.acceptInvitation as jest.Mock).mockRejectedValueOnce(
        new NotFoundException("Invitation not found or already used"),
      );

      await expect(
        controller.acceptInvitation("bad-token", mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it("should propagate BadRequestException for expired invitations", async () => {
      (service.acceptInvitation as jest.Mock).mockRejectedValueOnce(
        new BadRequestException("Invitation has expired"),
      );

      await expect(
        controller.acceptInvitation("expired-token", mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it("should propagate ConflictException when user is already a member", async () => {
      (service.acceptInvitation as jest.Mock).mockRejectedValueOnce(
        new ConflictException("You are already a member of this organization"),
      );

      await expect(
        controller.acceptInvitation("already-member-token", mockRequest),
      ).rejects.toThrow(ConflictException);
    });
  });
});
