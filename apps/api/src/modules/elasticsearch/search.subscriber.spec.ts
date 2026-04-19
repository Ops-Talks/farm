import { Test, TestingModule } from "@nestjs/testing";
import { getDataSourceToken } from "@nestjs/typeorm";
import { SearchSubscriber } from "./search.subscriber";
import { SearchIndexService } from "./search-index.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";

/**
 * Unit tests for SearchSubscriber.
 *
 * The TypeORM DataSource and SearchIndexService are replaced with plain mocks.
 * Entity instances are created via Object.create() so that instanceof checks
 * inside resolveType() work correctly without triggering TypeORM lifecycle hooks.
 */
describe("SearchSubscriber", () => {
  let subscriber: SearchSubscriber;
  let mockSearchIndexService: {
    indexDocument: jest.Mock;
    removeDocument: jest.Mock;
  };
  let mockDataSource: { subscribers: unknown[] };

  beforeEach(async () => {
    mockSearchIndexService = {
      indexDocument: jest.fn().mockResolvedValue(undefined),
      removeDocument: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = { subscribers: [] };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchSubscriber,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: SearchIndexService,
          useValue: mockSearchIndexService,
        },
      ],
    }).compile();

    subscriber = module.get<SearchSubscriber>(SearchSubscriber);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // onModuleInit
  // ---------------------------------------------------------------------------

  describe("onModuleInit()", () => {
    it("registers itself in dataSource.subscribers", () => {
      subscriber.onModuleInit();
      expect(mockDataSource.subscribers).toContain(subscriber);
    });
  });

  // ---------------------------------------------------------------------------
  // afterInsert
  // ---------------------------------------------------------------------------

  describe("afterInsert()", () => {
    it("indexes a Component entity after insert", async () => {
      const entity = Object.create(Component.prototype) as Component;
      entity.id = "comp-1";

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);

      // Fire-and-forget: flush the microtask queue
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "component",
      );
    });

    it("indexes a Team entity after insert", async () => {
      const entity = Object.create(Team.prototype) as Team;
      entity.id = "team-1";

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "team",
      );
    });

    it("indexes a Documentation entity after insert", async () => {
      const entity = Object.create(Documentation.prototype) as Documentation;
      entity.id = "doc-1";

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "documentation",
      );
    });

    it("indexes an Environment entity after insert", async () => {
      const entity = Object.create(Environment.prototype) as Environment;
      entity.id = "env-1";

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "environment",
      );
    });

    it("indexes a Pipeline entity after insert", async () => {
      const entity = Object.create(Pipeline.prototype) as Pipeline;
      entity.id = "pipe-1";

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "pipeline",
      );
    });

    it("does not index an unrecognized entity type", async () => {
      const entity = { id: "unknown-1" };

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).not.toHaveBeenCalled();
    });

    it("logs error and does not throw when indexDocument rejects", async () => {
      const entity = Object.create(Component.prototype) as Component;
      entity.id = "comp-err";

      mockSearchIndexService.indexDocument.mockRejectedValue(
        new Error("ES down"),
      );

      subscriber.afterInsert({ entity } as Parameters<
        typeof subscriber.afterInsert
      >[0]);
      await Promise.resolve();
      await Promise.resolve(); // flush rejection handler
    });
  });

  // ---------------------------------------------------------------------------
  // afterUpdate
  // ---------------------------------------------------------------------------

  describe("afterUpdate()", () => {
    it("re-indexes a Component entity after update", async () => {
      const entity = Object.create(Component.prototype) as Component;
      entity.id = "comp-2";

      subscriber.afterUpdate({ entity } as Parameters<
        typeof subscriber.afterUpdate
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).toHaveBeenCalledWith(
        entity,
        "component",
      );
    });

    it("does nothing when entity is undefined on update event", async () => {
      subscriber.afterUpdate({ entity: undefined } as Parameters<
        typeof subscriber.afterUpdate
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).not.toHaveBeenCalled();
    });

    it("does not re-index an unrecognized entity type on update", async () => {
      const entity = { id: "other-1" };

      subscriber.afterUpdate({ entity } as Parameters<
        typeof subscriber.afterUpdate
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.indexDocument).not.toHaveBeenCalled();
    });

    it("logs error and does not throw when indexDocument rejects on update", async () => {
      const entity = Object.create(Team.prototype) as Team;
      entity.id = "team-err";

      mockSearchIndexService.indexDocument.mockRejectedValue(
        new Error("timeout"),
      );

      subscriber.afterUpdate({ entity } as Parameters<
        typeof subscriber.afterUpdate
      >[0]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  // ---------------------------------------------------------------------------
  // afterRemove
  // ---------------------------------------------------------------------------

  describe("afterRemove()", () => {
    it("removes a Component document after remove", async () => {
      const entity = Object.create(Component.prototype) as Component;
      entity.id = "comp-3";

      subscriber.afterRemove({ entity } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.removeDocument).toHaveBeenCalledWith(
        "comp-3",
      );
    });

    it("removes a Team document after remove", async () => {
      const entity = Object.create(Team.prototype) as Team;
      entity.id = "team-3";

      subscriber.afterRemove({ entity } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.removeDocument).toHaveBeenCalledWith(
        "team-3",
      );
    });

    it("does nothing when entity is undefined on remove event", async () => {
      subscriber.afterRemove({ entity: undefined } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.removeDocument).not.toHaveBeenCalled();
    });

    it("does nothing when entity type is unrecognized on remove", async () => {
      const entity = { id: "unknown-2" };

      subscriber.afterRemove({ entity } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.removeDocument).not.toHaveBeenCalled();
    });

    it("does nothing when entity has no id on remove", async () => {
      const entity = Object.create(Component.prototype) as Component;
      // id intentionally not set

      subscriber.afterRemove({ entity } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();

      expect(mockSearchIndexService.removeDocument).not.toHaveBeenCalled();
    });

    it("logs error and does not throw when removeDocument rejects", async () => {
      const entity = Object.create(Environment.prototype) as Environment;
      entity.id = "env-err";

      mockSearchIndexService.removeDocument.mockRejectedValue(
        new Error("index gone"),
      );

      subscriber.afterRemove({ entity } as Parameters<
        typeof subscriber.afterRemove
      >[0]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
