import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";

/**
 * Custom guard for LDAP authentication that checks whether LDAP is configured
 * before delegating to the Passport "ldapauth" strategy.
 *
 * When LDAP_URL is not set, the guard short-circuits with a 503 Service
 * Unavailable response. This prevents the Passport strategy from attempting
 * a connection to a non-existent LDAP server.
 */
@Injectable()
export class LdapAuthGuard extends AuthGuard("ldapauth") implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (!this.configService.get<string>("ldap.url")) {
      throw new ServiceUnavailableException(
        "LDAP authentication is not configured",
      );
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
