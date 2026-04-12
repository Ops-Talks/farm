import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { TemplateEngineService } from "./template-engine.service";

describe("TemplateEngineService", () => {
  let service: TemplateEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateEngineService],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("should render a simple template string", () => {
      const result = service.render("Hello, {{ name }}!", { name: "World" });
      expect(result).toBe("Hello, World!");
    });

    it("should apply camelCase filter", () => {
      const result = service.render("{{ value | camelCase }}", {
        value: "my-service-name",
      });
      expect(result).toBe("myServiceName");
    });

    it("should apply snakeCase filter", () => {
      const result = service.render("{{ value | snakeCase }}", {
        value: "myServiceName",
      });
      expect(result).toBe("my_service_name");
    });

    it("should apply kebabCase filter", () => {
      const result = service.render("{{ value | kebabCase }}", {
        value: "myServiceName",
      });
      expect(result).toBe("my-service-name");
    });

    it("should apply pascalCase filter", () => {
      const result = service.render("{{ value | pascalCase }}", {
        value: "my-service-name",
      });
      expect(result).toBe("MyServiceName");
    });

    it("should handle missing variables gracefully (renders empty string)", () => {
      const result = service.render("{{ missingVar }}", {});
      expect(result).toBe("");
    });

    it("should throw BadRequestException on invalid template syntax", () => {
      expect(() => service.render("{% invalidtag %}", {})).toThrow(
        BadRequestException,
      );
      expect(() => service.render("{% invalidtag %}", {})).toThrow(
        /Template rendering failed:/,
      );
    });
  });
});
