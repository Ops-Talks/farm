import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createE2EApp, registerAndLogin } from './helpers/e2e-setup';
import { Component } from '../src/modules/catalog/entities/component.entity';

/**
 * End-to-end tests for the Registry vulnerability endpoints.
 * Uses a better-sqlite3 in-memory database; no real registry provider is
 * contacted because REGISTRY_TYPE is unset in test mode.
 */
describe('Registry Vulnerabilities (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let organizationId: string;
  let componentId: string;
  let componentWithImageId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    ({ token, organizationId } = await registerAndLogin(app));

    // Create a component without a container image
    const res = await request(app.getHttpServer())
      .post('/api/v1/catalog/components')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        name: 'vuln-test-service',
        kind: 'service',
        owner: 'platform-team',
        lifecycle: 'production',
      })
      .expect(201);

    componentId = (res.body as { id: string }).id;

    // Create a component with a container image
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/catalog/components')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Organization-Id', organizationId)
      .send({
        name: 'vuln-test-service-with-image',
        kind: 'service',
        owner: 'platform-team',
        lifecycle: 'production',
      })
      .expect(201);

    componentWithImageId = (res2.body as { id: string }).id;

    // Attach a container image to the second component
    const componentRepo = app.get<Repository<Component>>(getRepositoryToken(Component));
    await componentRepo.update(componentWithImageId, {
      containerImage: {
        registry: 'ecr',
        image: '123456789.dkr.ecr.us-east-1.amazonaws.com/my-service',
        latestTag: '1.0.0',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/registry/components/:id/vulnerabilities', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/registry/components/${componentId}/vulnerabilities`)
        .expect(401);
    });

    it('should return empty array for a component with no vulnerabilities', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/registry/components/${componentId}/vulnerabilities`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return empty array when filtering by severity on a clean component', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/registry/components/${componentId}/vulnerabilities?severity=CRITICAL`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /api/v1/registry/components/:id/vulnerabilities/summary', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/registry/components/${componentId}/vulnerabilities/summary`)
        .expect(401);
    });

    it('should return zero counts for a clean component', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/registry/components/${componentId}/vulnerabilities/summary`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        total: 0,
      });
    });
  });

  describe('POST /api/v1/registry/components/:id/vulnerabilities/sync', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/registry/components/${componentId}/vulnerabilities/sync`)
        .expect(401);
    });

    it('should return 404 for a non-existent component', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/registry/components/00000000-0000-0000-0000-000000000000/vulnerabilities/sync')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 400 when component has no containerImage configured', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/registry/components/${componentId}/vulnerabilities/sync`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should return 200 and run sync inline when component has containerImage (no adapter configured)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/registry/components/${componentWithImageId}/vulnerabilities/sync`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // No real adapter is configured, so sync runs inline and returns 0 CVEs
      expect(res.body).toMatchObject({ queued: false, count: 0 });
    });
  });
});
