import { plainToInstance } from "class-transformer";
import {
  CreateComponentDto,
  HelmChartMetadataDto,
} from "./create-component.dto";
import { ComponentKind } from "../entities/component.entity";

/**
 * Unit tests for CreateComponentDto class-transformer branches.
 * Specifically covers the @Type(() => HelmChartMetadataDto) decorator on the
 * helmChart field, which creates an instance when a plain object is provided.
 */
describe("CreateComponentDto", () => {
  const basePayload = {
    name: "my-service",
    kind: ComponentKind.SERVICE,
    owner: "platform-team",
  };

  describe("helmChart @Type transformation", () => {
    it("should transform a plain object into a HelmChartMetadataDto instance", () => {
      const dto = plainToInstance(CreateComponentDto, {
        ...basePayload,
        helmChart: {
          repo: "https://charts.example.com",
          chart: "my-chart",
          version: "1.0.0",
          valuesRef: "my-values-secret",
        },
      });

      expect(dto.helmChart).toBeInstanceOf(HelmChartMetadataDto);
      expect(dto.helmChart?.repo).toBe("https://charts.example.com");
      expect(dto.helmChart?.chart).toBe("my-chart");
      expect(dto.helmChart?.version).toBe("1.0.0");
      expect(dto.helmChart?.valuesRef).toBe("my-values-secret");
    });

    it("should handle a partial helmChart object and leave undefined fields as undefined", () => {
      const dto = plainToInstance(CreateComponentDto, {
        ...basePayload,
        helmChart: { chart: "partial-chart" },
      });

      expect(dto.helmChart).toBeInstanceOf(HelmChartMetadataDto);
      expect(dto.helmChart?.chart).toBe("partial-chart");
      expect(dto.helmChart?.version).toBeUndefined();
    });

    it("should keep helmChart as null when null is explicitly provided", () => {
      const dto = plainToInstance(CreateComponentDto, {
        ...basePayload,
        helmChart: null,
      });

      expect(dto.helmChart).toBeNull();
    });

    it("should keep helmChart as undefined when the field is omitted", () => {
      const dto = plainToInstance(CreateComponentDto, { ...basePayload });

      expect(dto.helmChart).toBeUndefined();
    });
  });

  describe("HelmChartMetadataDto", () => {
    it("should instantiate with all optional fields absent", () => {
      const meta = plainToInstance(HelmChartMetadataDto, {});

      expect(meta).toBeInstanceOf(HelmChartMetadataDto);
      expect(meta.repo).toBeUndefined();
      expect(meta.chart).toBeUndefined();
      expect(meta.version).toBeUndefined();
      expect(meta.valuesRef).toBeUndefined();
    });
  });
});
