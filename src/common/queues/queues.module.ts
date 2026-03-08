import { Module, DynamicModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { NotificationProcessor } from "./notification.processor";

export const QUEUE_NAMES = {
  CATALOG_DISCOVERY: "catalog-discovery",
  NOTIFICATIONS: "notifications",
} as const;

@Module({})
export class QueuesModule {
  static register(): DynamicModule {
    const isTest = process.env.NODE_ENV === "test";

    if (isTest) {
      return {
        module: QueuesModule,
        global: true,
      };
    }

    return {
      module: QueuesModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get<string>("cache.redisHost") || "localhost",
              port: configService.get<number>("cache.redisPort") ?? 6379,
            },
          }),
        }),
        BullModule.registerQueue(
          { name: QUEUE_NAMES.CATALOG_DISCOVERY },
          { name: QUEUE_NAMES.NOTIFICATIONS },
        ),
        BullBoardModule.forRoot({
          route: "/admin/queues",
          adapter: ExpressAdapter,
        }),
        BullBoardModule.forFeature(
          { name: QUEUE_NAMES.CATALOG_DISCOVERY, adapter: BullMQAdapter },
          { name: QUEUE_NAMES.NOTIFICATIONS, adapter: BullMQAdapter },
        ),
      ],
      providers: [NotificationProcessor],
    };
  }
}
