import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogService } from "./catalog.service";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "./entities/component.entity";
import { EventsGateway } from "../../common/events/events.gateway";

/**
 * Unit tests for helmChart field persistence and catalog-info.yaml discovery.
 */
describe("Catalog helmChart integration", () => {
  let service: CatalogService;

  const mockEventsGateway = {
    emitComponentCreated: jest.fn(),
    emitComponentUpdated: jest.fn(),
    emitComponentDeleted: jest.fn(),
  };

  const buildMockComponent = (
    overrides: Partial<Component> = {},
  ): Component => ({
    id: "comp-uuid-1",
    name: "helm-service",
    kind: ComponentKind.SERVICE,
    description: "A helm-managed service",
    owner: "platform-team",
    teamId: null as unknown as string,
    team: null,
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: [],
    links: [],
    metadata: {},
    helmChart: null,
    dependencies: [],
    organizationId: null as unknown as string,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockRepository = {
    create: jest
      .fn()
      .mockImplementation((dto: Partial<Component>) => dto as Component),
    save: jest
      .fn()
      .mockImplementation((c: Component) =>
        Promise.resolve({ ...c, id: c.id ?? "new-uuid" } as Component),
      ),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findBy: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    merge: jest
      .fn()
      .mockImplementation(
        (entity: Component, dto: Partial<Component>) =>
          ({ ...entity, ...dto }) as Component,
      ),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(Component), useValue: mockRepository },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  // -------------------------------------------------------------------------
  // helmChart field persistence
  // -------------------------------------------------------------------------
  describe("helmChart field persistence", () => {
    it("should persist helmChart metadata when provided via CreateComponentDto", async () => {
      const helmChart = {
        repo: "https://charts.bitnami.com/bitnami",
        chart: "postgresql",
        version: "12.1.0",
        valuesRef: "my-values-secret",
      };

      await service.create({
        name: "helm-service",
        kind: ComponentKind.SERVICE,
        owner: "platform-team",
        helmChart,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ helmChart }),
      );
    });

    it("should allow helmChart to be null for components without helm metadata", async () => {
      await service.create({
        name: "plain-service",
        kind: ComponentKind.SERVICE,
        owner: "platform-team",
        helmChart: null,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ helmChart: null }),
      );
    });

    it("should update helmChart metadata via UpdateComponentDto", async () => {
      const existing = buildMockComponent({ helmChart: null });
      mockRepository.findOne.mockResolvedValue(existing);

      const updatedChart = { chart: "redis", version: "17.0.0" };
      await service.update(existing.id, { helmChart: updatedChart });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ helmChart: updatedChart }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // catalog-info.yaml discovery — spec.helm mapping
  // -------------------------------------------------------------------------
  describe("registerYaml with spec.helm", () => {
    it("should map spec.helm fields to helmChart when present in YAML", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: postgres-db
  description: Managed PostgreSQL via Helm
spec:
  type: database
  owner: data-team
  lifecycle: production
  helm:
    repo: https://charts.bitnami.com/bitnami
    chart: postgresql
    version: 12.1.0
    valuesRef: postgres-values-secret
`;

      await service.registerYaml(yaml);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          helmChart: {
            repo: "https://charts.bitnami.com/bitnami",
            chart: "postgresql",
            version: "12.1.0",
            valuesRef: "postgres-values-secret",
          },
        }),
      );
    });

    it("should set helmChart to null when spec.helm is not present in YAML", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: basic-service
spec:
  type: service
  owner: platform-team
`;

      await service.registerYaml(yaml);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ helmChart: null }),
      );
    });

    it("should handle partial spec.helm fields gracefully", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: partial-helm-service
spec:
  type: service
  owner: dev-team
  helm:
    chart: my-custom-chart
`;

      await service.registerYaml(yaml);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          helmChart: {
            repo: undefined,
            chart: "my-custom-chart",
            version: undefined,
            valuesRef: undefined,
          },
        }),
      );
    });
  });
});
