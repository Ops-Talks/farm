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
import { KeycloakOidcService } from "./keycloak-oidc.service";
import { KeycloakSyncService } from "./keycloak-sync.service";
import { KeycloakSyncProcessor } from "./keycloak-sync.processor";
import { User } from "./entities/user.entity";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GithubStrategy } from "./strategies/github.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Team } from "../teams/entities/team.entity";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

const isTest = process.env.NODE_ENV === "test";

/**
 * Module for authentication and user management.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, IntegrationCredential, Team]),
    PassportModule,
    HttpModule,
    ScheduleModule.forRoot(),
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
      : [BullModule.registerQueue({ name: QUEUE_NAMES.KEYCLOAK_SYNC })]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GithubStrategy,
    GoogleStrategy,
    KeycloakOidcService,
    KeycloakSyncService,
    ...(isTest ? [] : [KeycloakSyncProcessor]),
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
