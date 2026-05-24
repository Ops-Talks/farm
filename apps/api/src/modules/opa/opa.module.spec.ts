import { Global, Module } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { OpaModule } from "./opa.module";
import { OpaResult } from "./entities/opa-result.entity";
import { OpaService } from "./opa.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

/**
 * Minimal mock of CircuitBreakerModule.
 *
 * CircuitBreakerModule is @Global() in AppModule, so in isolated module tests
 * we replicate that pattern here to make CircuitBreakerService available to
 * OpaModule's providers without bootstrapping the full application.
 */
@Global()
@Module({
  providers: [
    {
      provide: CircuitBreakerService,
      useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
    },
  ],
  exports: [CircuitBreakerService],
})
class MockCircuitBreakerModule {}

/**
 * Minimal compilation test for OpaModule.
 */
describe("OpaModule", () => {
  let module: TestingModule;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MockCircuitBreakerModule,
        OpaModule,
      ],
    })
      .overrideProvider(getRepositoryToken(OpaResult))
      .useValue(mockRepository)
      .compile();
  }, 30000);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it("should compile the module", () => {
    expect(module).toBeDefined();
  });

  it("should provide OpaService", () => {
    const service = module.get<OpaService>(OpaService);
    expect(service).toBeDefined();
  });

  it("OpaResult entity can be instantiated", () => {
    const entity = new OpaResult();
    expect(entity).toBeInstanceOf(OpaResult);
  });
});
