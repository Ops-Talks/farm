import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// No external mocks needed for this pure-form component

import { CloudDeployStageCard } from './CloudDeployStageCard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudDeployStageCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── aws-ecs ────────────────────────────────────────────────────────────────

  describe('aws-ecs', () => {
    it('renders correct fields', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-ecs" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByLabelText(/cluster/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image/i)).toBeInTheDocument();
    });

    it('validates required fields and shows errors', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-ecs" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(screen.getByText('Cluster name is required')).toBeInTheDocument();
      });

      expect(screen.getByText('Service name is required')).toBeInTheDocument();
      expect(screen.getByText('Image is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with correct config on valid submit', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-ecs" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByLabelText(/cluster/i), 'my-cluster');
      await user.type(screen.getByLabelText(/service/i), 'my-service');
      await user.type(screen.getByLabelText(/image/i), 'my-image:latest');

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          engine: 'aws-ecs',
          cluster: 'my-cluster',
          service: 'my-service',
          image: 'my-image:latest',
        });
      });
    });

    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-ecs" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  // ── aws-lambda ─────────────────────────────────────────────────────────────

  describe('aws-lambda', () => {
    it('renders correct fields including optional ones', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-lambda" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByLabelText(/function name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image uri/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/s3 bucket/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/s3 key/i)).toBeInTheDocument();
    });

    it('validates functionName as required', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-lambda" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(screen.getByText('Function name is required')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with engine=aws-lambda', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="aws-lambda" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByLabelText(/function name/i), 'my-fn');
      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ engine: 'aws-lambda', functionName: 'my-fn' }),
        );
      });
    });
  });

  // ── gcp-cloud-run ──────────────────────────────────────────────────────────

  describe('gcp-cloud-run', () => {
    it('renders correct fields', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="gcp-cloud-run" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByLabelText(/service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project id/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="gcp-cloud-run" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(screen.getByText('Service name is required')).toBeInTheDocument();
      });

      expect(screen.getByText('Region is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with engine=gcp-cloud-run', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="gcp-cloud-run" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByLabelText(/^service/i), 'my-cloudrun-svc');
      await user.type(screen.getByLabelText(/region/i), 'us-central1');
      await user.type(screen.getByLabelText(/image/i), 'gcr.io/proj/app:v1');

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            engine: 'gcp-cloud-run',
            service: 'my-cloudrun-svc',
            region: 'us-central1',
          }),
        );
      });
    });
  });

  // ── azure-container-apps ───────────────────────────────────────────────────

  describe('azure-container-apps', () => {
    it('renders correct fields', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="azure-container-apps" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByLabelText(/resource group/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/app name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="azure-container-apps" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(screen.getByText('Resource group is required')).toBeInTheDocument();
      });

      expect(screen.getByText('App name is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave with engine=azure-container-apps', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <CloudDeployStageCard engine="azure-container-apps" onSave={onSave} onCancel={onCancel} />,
        { wrapper: createWrapper() },
      );

      await user.type(screen.getByLabelText(/resource group/i), 'my-rg');
      await user.type(screen.getByLabelText(/app name/i), 'my-app');
      await user.type(screen.getByLabelText(/image/i), 'myregistry.azurecr.io/app:v1');

      await user.click(screen.getByRole('button', { name: /save stage/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            engine: 'azure-container-apps',
            resourceGroup: 'my-rg',
            appName: 'my-app',
            image: 'myregistry.azurecr.io/app:v1',
          }),
        );
      });
    });
  });
});
