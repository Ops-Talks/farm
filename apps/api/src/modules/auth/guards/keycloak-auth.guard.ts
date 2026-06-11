import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Response } from "express";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import * as passport from "passport";

@Injectable()
export class KeycloakDynamicGuard implements CanActivate {
  constructor(private readonly keycloakOidcService: KeycloakOidcService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<
      Request & { session?: Record<string, string> }
    >();
    const res = ctx.getResponse<Response>();

    const orgId = (
      (req as unknown as Record<string, unknown>).query as Record<
        string,
        string
      >
    ).orgId;

    if (!orgId) {
      res.redirect("/?error=keycloak_not_configured");
      return false;
    }

    const strategy = await this.keycloakOidcService.getStrategyForOrg(orgId);

    if (!strategy) {
      res.redirect("/?error=keycloak_not_configured");
      return false;
    }

    req.session = req.session || {};
    req.session["keycloakOrgId"] = orgId;

    return new Promise<boolean>((resolve, reject) => {
      const strategyName = `keycloak-dynamic-${orgId}`;
      passport.use(strategyName, strategy as never);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      passport.authenticate(strategyName, {
        scope: ["openid", "email", "profile"],
      })(req, res as never, (err?: unknown) => {
        passport.unuse?.(strategyName);
        if (err) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}
