import { DynamicModule, Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { CircuitBreakerModule } from "../../common/circuit-breaker/circuit-breaker.module";
import { HttpModule } from "../../common/http/http.module";
import { PerUserThrottlerGuard } from "../../common/guards/per-user-throttler.guard";

@Global()
@Module({})
export class SecurityInfraModule {
  static forRoot(): DynamicModule {
    return {
      module: SecurityInfraModule,
      imports: [
        CircuitBreakerModule,
        HttpModule,
        ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            throttlers: [
              { name: "short", ttl: 1000, limit: 5 },
              { name: "long", ttl: 60000, limit: 100 },
            ],
            skipIf: () =>
              configService.get<string>("env") === "test" ||
              process.env.NODE_ENV === "test",
          }),
        }),
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: PerUserThrottlerGuard,
        },
      ],
      exports: [CircuitBreakerModule, HttpModule, ThrottlerModule],
    };
  }
}
