import { Global, Module } from "@nestjs/common";
import { HttpModule as NestHttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [
    NestHttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>("http.timeout", 10000),
        maxRedirects: configService.get<number>("http.maxRedirects", 5),
      }),
    }),
  ],
  exports: [NestHttpModule],
})
export class HttpModule {}
