/**
 * Manual mock for @kubernetes/client-node used in e2e tests.
 * The real package is ESM-only and cannot be loaded by Jest in CJS mode.
 * This mock provides the minimal API surface used by KubernetesService.
 */

export class KubeConfig {
  loadFromDefault = jest.fn();
  loadFromCluster = jest.fn();
  loadFromFile = jest.fn();
  makeApiClient = jest.fn().mockImplementation((ApiClass: unknown) => {
    if (ApiClass === AppsV1Api) {
      return new AppsV1Api();
    }
    if (ApiClass === CoreV1Api) {
      return new CoreV1Api();
    }
    if (ApiClass === ApiextensionsV1Api) {
      return new ApiextensionsV1Api();
    }
    if (ApiClass === CustomObjectsApi) {
      return new CustomObjectsApi();
    }
    return {};
  });
}

export class AppsV1Api {
  listDeploymentForAllNamespaces = jest.fn().mockResolvedValue({ items: [] });
  listDaemonSetForAllNamespaces = jest.fn().mockResolvedValue({ items: [] });
}

export class CoreV1Api {
  listSecretForAllNamespaces = jest.fn().mockResolvedValue({ items: [] });
  listNamespacedSecret = jest.fn().mockResolvedValue({ items: [] });
  listNode = jest.fn().mockResolvedValue({ items: [] });
  listPodForAllNamespaces = jest.fn().mockResolvedValue({ items: [] });
  connectGetNamespacedPodProxy = jest.fn().mockResolvedValue("");
}

export class ApiextensionsV1Api {
  listCustomResourceDefinition = jest.fn().mockResolvedValue({ items: [] });
}

export class CustomObjectsApi {
  listClusterCustomObject = jest.fn().mockResolvedValue({ items: [] });
  listNamespacedCustomObject = jest.fn().mockResolvedValue({ items: [] });
}
