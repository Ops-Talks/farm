import { Permission, RolePermissions } from "@farm/types";
import { OrgRole } from "@farm/types";

describe("RolePermissions", () => {
  it("defines an entry for every OrgRole", () => {
    const roles = Object.values(OrgRole);
    roles.forEach((role) => {
      expect(RolePermissions[role]).toBeDefined();
      expect(Array.isArray(RolePermissions[role])).toBe(true);
    });
  });

  describe("VIEWER", () => {
    it("has no permissions", () => {
      expect(RolePermissions[OrgRole.VIEWER]).toHaveLength(0);
    });
  });

  describe("MEMBER", () => {
    it("can write catalog entries", () => {
      expect(RolePermissions[OrgRole.MEMBER]).toContain(
        Permission.CATALOG_WRITE,
      );
    });

    it("can trigger pipelines", () => {
      expect(RolePermissions[OrgRole.MEMBER]).toContain(
        Permission.PIPELINE_TRIGGER,
      );
    });

    it("cannot delete catalog entries", () => {
      expect(RolePermissions[OrgRole.MEMBER]).not.toContain(
        Permission.CATALOG_DELETE,
      );
    });

    it("cannot delete pipelines", () => {
      expect(RolePermissions[OrgRole.MEMBER]).not.toContain(
        Permission.PIPELINE_DELETE,
      );
    });

    it("cannot manage teams", () => {
      expect(RolePermissions[OrgRole.MEMBER]).not.toContain(
        Permission.TEAM_MANAGE,
      );
    });

    it("cannot manage the organization", () => {
      expect(RolePermissions[OrgRole.MEMBER]).not.toContain(
        Permission.ORG_MANAGE,
      );
    });
  });

  describe("ADMIN", () => {
    it("has all MEMBER permissions", () => {
      const memberPerms = RolePermissions[OrgRole.MEMBER];
      memberPerms.forEach((perm) => {
        expect(RolePermissions[OrgRole.ADMIN]).toContain(perm);
      });
    });

    it("can delete catalog entries", () => {
      expect(RolePermissions[OrgRole.ADMIN]).toContain(
        Permission.CATALOG_DELETE,
      );
    });

    it("can delete pipelines", () => {
      expect(RolePermissions[OrgRole.ADMIN]).toContain(
        Permission.PIPELINE_DELETE,
      );
    });

    it("can manage teams", () => {
      expect(RolePermissions[OrgRole.ADMIN]).toContain(Permission.TEAM_MANAGE);
    });

    it("cannot manage the organization", () => {
      expect(RolePermissions[OrgRole.ADMIN]).not.toContain(
        Permission.ORG_MANAGE,
      );
    });
  });

  describe("OWNER", () => {
    it("has all ADMIN permissions", () => {
      const adminPerms = RolePermissions[OrgRole.ADMIN];
      adminPerms.forEach((perm) => {
        expect(RolePermissions[OrgRole.OWNER]).toContain(perm);
      });
    });

    it("can manage the organization", () => {
      expect(RolePermissions[OrgRole.OWNER]).toContain(Permission.ORG_MANAGE);
    });

    it("grants every defined permission", () => {
      const allPerms = Object.values(Permission);
      allPerms.forEach((perm) => {
        expect(RolePermissions[OrgRole.OWNER]).toContain(perm);
      });
    });
  });
});
