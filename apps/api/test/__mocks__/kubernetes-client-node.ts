/**
 * Manual mock for @kubernetes/client-node used in e2e tests.
 * The real package is ESM-only and cannot be loaded by Jest in CJS mode.
 * This mock provides the minimal API surface used by KubernetesService.
 */

export class KubeConfig {
  loadFromDefault = jest.fn();
  loadFromCluster = jest.fn();
  loadFromFile = jest.fn();
  makeApiClient = jest.fn().mockReturnValue({
    listDeploymentForAllNamespaces: jest.fn().mockResolvedValue({ items: [] }),
  });
}

export class AppsV1Api {
  listDeploymentForAllNamespaces = jest.fn().mockResolvedValue({ items: [] });
}
