# Testing

This guide covers testing strategies and practices for Farm development.

## Overview

Farm uses Jest as its testing framework. The test suite includes:

- Unit tests for individual components
- End-to-end tests for API validation

## Test Structure

```
farm/
  src/
    **/*.spec.ts          # Unit tests (co-located with source)
  test/
    app.e2e-spec.ts       # End-to-end tests
    jest-e2e.json         # E2E Jest configuration
```

## Running Tests

### Unit Tests

Run all unit tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:cov
```

### End-to-End Tests

Run E2E tests:

```bash
npm run test:e2e
```

### Debug Tests

Run tests with debugging:

```bash
npm run test:debug
```

## Writing Unit Tests

### Test File Naming

Unit test files should be named with the `.spec.ts` suffix and located alongside the source file:

```
catalog.service.ts
catalog.service.spec.ts
```

### Basic Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new component', () => {
      const dto = {
        name: 'test-service',
        kind: ComponentKind.SERVICE,
        owner: 'test-team',
      };

      const result = service.create(dto);

      expect(result.name).toBe('test-service');
      expect(result.id).toBeDefined();
    });
  });
});
```

### Testing Services

Services contain business logic and should be thoroughly tested:

```typescript
describe('findOne', () => {
  it('should return a component by ID', () => {
    const created = service.create({
      name: 'test',
      kind: ComponentKind.SERVICE,
      owner: 'team',
    });

    const found = service.findOne(created.id);

    expect(found).toEqual(created);
  });

  it('should throw NotFoundException when not found', () => {
    expect(() => service.findOne('invalid-id')).toThrow(NotFoundException);
  });
});
```

### Testing Controllers

Controllers should be tested for proper request handling:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

describe('CatalogController', () => {
  let controller: CatalogController;
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [CatalogService],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get<CatalogService>(CatalogService);
  });

  describe('findAll', () => {
    it('should return all components', () => {
      const result = controller.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

## Writing End-to-End Tests

E2E tests validate the API from an external perspective:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });
});
```

## Test Coverage

### Viewing Coverage Report

```bash
npm run test:cov
```

Coverage reports are generated in the `coverage/` directory.

### Coverage Goals

Aim for the following coverage targets:

| Type | Target |
|------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

## Best Practices

### Test Organization

- Group related tests with `describe` blocks
- Use clear, descriptive test names
- Follow the Arrange-Act-Assert pattern

### Test Independence

- Each test should be independent
- Use `beforeEach` to reset state
- Avoid test order dependencies

### Mocking

When testing units in isolation, mock dependencies:

```typescript
const mockService = {
  findAll: jest.fn().mockReturnValue([]),
  findOne: jest.fn().mockReturnValue(mockComponent),
};

const module: TestingModule = await Test.createTestingModule({
  controllers: [CatalogController],
  providers: [
    { provide: CatalogService, useValue: mockService },
  ],
}).compile();
```

### Testing Error Cases

Always test error scenarios:

```typescript
it('should throw NotFoundException for invalid ID', () => {
  expect(() => service.findOne('invalid')).toThrow(NotFoundException);
});

it('should throw ConflictException for duplicate', () => {
  service.register({ username: 'user1', ... });
  expect(() => service.register({ username: 'user1', ... })).toThrow(ConflictException);
});
```

### Running Tests via Docker (Recommended)

To run tests in a clean, isolated container environment:

```bash
make test-docker
```

### Continuous Integration

Tests run automatically on pull requests. You can run the full project check locally using:

```bash
make check
```

This command runs formatting, linting, unit tests, and E2E tests.
