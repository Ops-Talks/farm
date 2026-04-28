import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserManagementService } from "./user-management.service";
import { UserManagementController } from "./user-management.controller";
import { KeycloakOidcService } from "./keycloak-oidc.service";
import { KeycloakSyncService } from "./keycloak-sync.service";
import { KeycloakSyncProcessor } from "./keycloak-sync.processor";
import { User } from "./entities/user.entity";
import { PasswordReset } from "./entities/password-reset.entity";
import { Organization } from "../organization/entities/organization.entity";
import { UserOrganization } from "../organization/entities/user-organization.entity";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GithubStrategy } from "./strategies/github.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { LdapAuthStrategy } from "./strategies/ldap.strategy";
import { LdapAuthGuard } from "./guards/ldap-auth.guard";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Team } from "../teams/entities/team.entity";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

const isTest = process.env.NODE_ENV === "test";

/**
 * Module for authentication and user management.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      PasswordReset,
      Organization,
      UserOrganization,
      IntegrationCredential,
      Team,
    ]),
    PassportModule,
    HttpModule,
    ScheduleModule.forRoot(),
    AuditLogModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("auth.jwtSecret") ??
          "super-secret-key-change-me-in-production",
        signOptions: {
          expiresIn: (configService.get<string>("auth.jwtExpiresIn") ??
            "3600s") as `${number}${"s" | "m" | "h" | "d"}`,
        },
      }),
    }),
    ...(isTest
      ? []
      : [
          BullModule.registerQueue({ name: QUEUE_NAMES.KEYCLOAK_SYNC }),
          BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
        ]),
  ],
  controllers: [AuthController, UserManagementController],
  providers: [
    AuthService,
    UserManagementService,
    LocalStrategy,
    JwtStrategy,
    GithubStrategy,
    GoogleStrategy,
    LdapAuthStrategy,
    LdapAuthGuard,
    KeycloakOidcService,
    KeycloakSyncService,
    ...(isTest ? [] : [KeycloakSyncProcessor]),
  ],
  exports: [AuthService, UserManagementService, JwtModule],
})
export class AuthModule {}
