import { Global, Module } from "@nestjs/common";
import { OrgContextService } from "./org-context.service";

/**
 * Global module that makes OrgContextService available throughout the
 * application without requiring each feature module to import it explicitly.
 *
 * OrgContextService is REQUEST-scoped so each HTTP request receives its own
 * isolated instance. NestJS handles the scope lifecycle automatically.
 */
@Global()
@Module({
  providers: [OrgContextService],
  exports: [OrgContextService],
})
export class CommonServicesModule {}
