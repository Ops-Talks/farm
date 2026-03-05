import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PluginManagerModule } from "./plugin-manager/plugin-manager.module";
import { CatalogModule } from "./catalog/catalog.module";
import { DocumentationModule } from "./documentation/documentation.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./common/health/health.module";
import { configuration, validationSchema } from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>("database.type") as "postgres",
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.username"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.name"),
        synchronize: configService.get<boolean>("database.synchronize"),
        autoLoadEntities: true,
        migrations: [__dirname + "/migrations/*.{.ts,.js}"],
        migrationsRun: configService.get<string>("env") === "production",
      }),
    }),
    HealthModule,
    PluginManagerModule.forRoot([
      {
        metadata: {
          name: "core-catalog",
          version: "1.0.0",
          description: "Software catalog management",
        },
        module: CatalogModule,
      },
      {
        metadata: {
          name: "core-documentation",
          version: "1.0.0",
          description: "Technical documentation management",
        },
        module: DocumentationModule,
      },
      {
        metadata: {
          name: "core-auth",
          version: "1.0.0",
          description: "Authentication and authorization",
        },
        module: AuthModule,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
