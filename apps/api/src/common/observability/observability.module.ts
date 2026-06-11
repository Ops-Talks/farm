import { Module } from "@nestjs/common";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";
import { TracesIngestController } from "./traces-ingest.controller";
import { PyroscopeInitService } from "../../modules/observability/pyroscope-init.service";

@Module({
  controllers: [ObservabilityController, TracesIngestController],
  providers: [ObservabilityService, PyroscopeInitService],
})
export class ObservabilityModule {}
