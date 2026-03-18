import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";
import { TracesIngestController } from "./traces-ingest.controller";

@Module({
  imports: [HttpModule],
  controllers: [ObservabilityController, TracesIngestController],
  providers: [ObservabilityService],
})
export class ObservabilityModule {}
