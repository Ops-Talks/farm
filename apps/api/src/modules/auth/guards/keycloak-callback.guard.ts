import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";
import * as passport from "passport";

@Injectable()
export class KeycloakCallbackGuard implements CanActivate {
  constructor(
    private readonly keycloakOidcService: KeycloakOidcService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<
      Request & { session?: Record<string, string> }
    >();
    const res = ctx.getResponse<Response>();
    const next = ctx.getNext<NextFunction>();

    const orgId = req.session?.keycloakOrgId;

    if (!orgId) {
      res.redirect("/?error=keycloak_not_configured");
      return false;
    }

    const strategy = await this.keycloakOidcService.getStrategyForOrg(orgId);

    if (!strategy) {
      res.redirect("/?error=keycloak_not_configured");
      return false;
    }

    return new Promise<boolean>((resolve, reject) => {
      const strategyName = `keycloak-callback-${orgId}`;
      passport.use(strategyName, strategy as never);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      passport.authenticate(
        strategyName,
        { session: false },
        (err: unknown, user: User | false | undefined) => {
          passport.unuse?.(strategyName);

          if (err || !user) {
            res.redirect("/?error=keycloak_auth_failed");
            resolve(false);
            return;
          }

          this.authService
            .findOrCreateOAuthUser("keycloak", user.oauthProviderId as string, {
              email: user.email,
              displayName: user.displayName,
            })
            .then((result) => {
              res.json({
                user: result.user,
                token: result.token,
                refreshToken: result.refreshToken,
              });
              resolve(true);
            })
            .catch(reject);
        },
      )(req as never, res as never, next as never);
    });
  }
}
