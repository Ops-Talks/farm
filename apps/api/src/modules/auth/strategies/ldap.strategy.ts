import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";
import { createRequire } from "module";

const _require =
  typeof __filename !== "undefined"
    ? createRequire(__filename)
    : createRequire(eval("import.meta.url"));
const LdapStrategy = _require("passport-ldapauth");

/**
 * Minimal shape of a user object returned by passport-ldapauth after a
 * successful LDAP bind and search.
 */
interface LdapUser {
  /** Distinguished name of the LDAP entry. */
  dn: string;
  /** Common UNIX login name attribute. */
  uid?: string;
  /** Common name (display name). */
  cn?: string;
  /** Primary email address attribute. */
  mail?: string;
  /** Full display name attribute. */
  displayName?: string;
  /** Given (first) name attribute. */
  givenName?: string;
  /** Surname (last name) attribute. */
  sn?: string;
  /**
   * Group membership attribute.
   * May be a single string or an array of DN strings depending on the server.
   */
  memberOf?: string | string[];
  [key: string]: unknown;
}

/**
 * Non-functional placeholder URL used when LDAP_URL is not configured.
 * The LdapAuthGuard prevents any request from reaching this strategy when
 * LDAP is not set up, so this URL is never actually contacted.
 */
const LDAP_NOOP_URL = "ldap://noop";

/**
 * Passport strategy for LDAP / Active Directory authentication.
 * Disabled gracefully when LDAP_URL is not configured.
 */
@Injectable()
export class LdapAuthStrategy extends PassportStrategy(
  LdapStrategy,
  "ldapauth",
) {
  private readonly logger = new Logger(LdapAuthStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const ldapUrl = configService.get<string>("ldap.url") || "";

    super({
      server: {
        url: ldapUrl || LDAP_NOOP_URL,
        bindDN: configService.get<string>("ldap.bindDn") || "",
        bindCredentials: configService.get<string>("ldap.bindPassword") || "",
        searchBase: configService.get<string>("ldap.searchBase") || "",
        searchFilter:
          configService.get<string>("ldap.searchFilter") ||
          "(uid={{username}})",
      },
    });

    if (!ldapUrl) {
      this.logger.log(
        "LDAP_URL is not configured — LDAP authentication strategy is registered but will not connect",
      );
    }
  }

  /**
   * Resolves (or creates) a Farm user from the authenticated LDAP entry.
   * Roles are derived from group membership when LDAP_ADMIN_GROUP is set.
   * @param ldapUser - The LDAP entry returned by passport-ldapauth
   * @returns The matched or newly created Farm user
   */
  async validate(ldapUser: LdapUser): Promise<User> {
    try {
      // Build an email address: prefer the mail attribute, fall back to
      // uid-based or DN-based synthetic addresses.
      const email =
        ldapUser.mail ??
        (ldapUser.uid
          ? `${ldapUser.uid}@ldap.local`
          : `${ldapUser.dn.split(",")[0].replace(/^[^=]+=/, "")}@ldap.local`);

      const displayName = ldapUser.displayName || ldapUser.cn || email;
      const firstName = ldapUser.givenName;
      const lastName = ldapUser.sn;

      // Determine roles from group membership.
      const adminGroup =
        this.configService.get<string>("ldap.adminGroup") || "";
      const memberOf: string[] = Array.isArray(ldapUser.memberOf)
        ? ldapUser.memberOf
        : ldapUser.memberOf
          ? [ldapUser.memberOf]
          : [];
      const isAdmin =
        adminGroup !== "" && memberOf.some((g) => g.includes(adminGroup));
      const roles: string[] = isAdmin ? ["admin", "user"] : ["user"];

      const result = await this.authService.findOrCreateOAuthUser(
        "ldap",
        ldapUser.dn,
        {
          email,
          displayName,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          roles,
        },
      );

      return result.user;
    } catch (error) {
      this.logger.error("LDAP OAuth user resolution failed", error);
      throw error;
    }
  }
}
