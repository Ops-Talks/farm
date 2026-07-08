import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRequire } from "module";

@Injectable()
export class PyroscopeInitService implements OnModuleInit {
  private readonly logger = new Logger(PyroscopeInitService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>("pyroscope.enabled");

    if (enabled !== "true") {
      return;
    }

    try {
      const _require =
        typeof __filename !== "undefined"
          ? createRequire(__filename)
          : createRequire(eval("import.meta.url") as string);
      const Pyroscope = _require("@pyroscope/nodejs");
      const serverAddress =
        this.configService.get<string>("pyroscope.url") ??
        "http://pyroscope:4040";
      const env = this.configService.get<string>("env") ?? "development";

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      Pyroscope.init({
        serverAddress,
        appName: "farm-api",
        tags: { environment: env },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      Pyroscope.start();

      this.logger.log(
        `Pyroscope profiling initialized — server: ${serverAddress}, env: ${env}`,
      );
    } catch (err) {
      this.logger.warn(
        "Pyroscope profiling could not be initialized (native dependency may be missing):",
        (err as Error).message,
      );
    }
  }
}
