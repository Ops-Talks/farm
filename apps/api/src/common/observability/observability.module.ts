import { Module } from "@nestjs/common";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";
import { TracesIngestController } from "./traces-ingest.controller";

@Module({
  controllers: [ObservabilityController, TracesIngestController],
  providers: [ObservabilityService],
})
export class ObservabilityModule {}
