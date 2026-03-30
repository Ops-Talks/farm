import { ServiceTemplateModule } from "./service-template.module";
import { ServiceTemplateService } from "./service-template.service";

describe("ServiceTemplateModule", () => {
  it("is defined as a NestJS module", () => {
    expect(ServiceTemplateModule).toBeDefined();
  });

  describe("OnModuleInit", () => {
    it("should call seedBuiltInTemplates on module init", async () => {
      const mockService = {
        seedBuiltInTemplates: jest.fn().mockResolvedValue(undefined),
      };

      const moduleInstance = new ServiceTemplateModule(
        mockService as unknown as ServiceTemplateService,
      );

      await moduleInstance.onModuleInit();

      expect(mockService.seedBuiltInTemplates).toHaveBeenCalledTimes(1);
    });
  });
});
