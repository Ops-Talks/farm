"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { integrations as integrationsApi } from "@/lib/api-client";
import type { IntegrationCredential } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/error-boundary";

// ---------------------------------------------------------------------------
// Integration metadata
// ---------------------------------------------------------------------------

type IntegrationType = "argocd" | "circleci" | "jenkins" | "travisci";

const INTEGRATIONS: {
  type: IntegrationType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    type: "argocd",
    label: "ArgoCD",
    icon: "🔄",
    description: "GitOps continuous delivery tool for Kubernetes.",
  },
  {
    type: "circleci",
    label: "CircleCI",
    icon: "⭕",
    description: "Cloud-native CI/CD platform.",
  },
  {
    type: "jenkins",
    label: "Jenkins",
    icon: "🤖",
    description: "Open-source automation server.",
  },
  {
    type: "travisci",
    label: "Travis CI",
    icon: "🔵",
    description: "Hosted CI service for GitHub projects.",
  },
];

// ---------------------------------------------------------------------------
// Zod schemas per integration type
// ---------------------------------------------------------------------------

const argoCDSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("A valid URL is required"),
  token: z.string().min(1, "Token is required"),
});

const circleCISchema = z.object({
  name: z.string().min(1, "Name is required"),
  token: z.string().min(1, "Token is required"),
});

const jenkinsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("A valid URL is required"),
  username: z.string().min(1, "Username is required"),
  apiToken: z.string().min(1, "API Token is required"),
});

const travisCISchema = z.object({
  name: z.string().min(1, "Name is required"),
  token: z.string().min(1, "Token is required"),
  url: z
    .string()
    .url("A valid URL is required")
    .optional()
    .or(z.literal("")),
});

type ArgoCDFormValues = z.infer<typeof argoCDSchema>;
type CircleCIFormValues = z.infer<typeof circleCISchema>;
type JenkinsFormValues = z.infer<typeof jenkinsSchema>;
type TravisCIFormValues = z.infer<typeof travisCISchema>;

// ---------------------------------------------------------------------------
// Per-type connect forms
// ---------------------------------------------------------------------------

const ArgoCDConnectForm = memo(function ArgoCDConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArgoCDFormValues>({ resolver: zodResolver(argoCDSchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="argocd-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="argocd-name" placeholder="e.g. Production ArgoCD" {...register("name")} />
        {errors.name?.message && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="argocd-url" className="text-sm font-medium">
          URL <span className="text-destructive">*</span>
        </label>
        <Input id="argocd-url" placeholder="https://argocd.example.com" {...register("url")} />
        {errors.url?.message && (
          <p className="text-xs text-destructive">{errors.url.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="argocd-token" className="text-sm font-medium">
          Token <span className="text-destructive">*</span>
        </label>
        <Input id="argocd-token" type="password" placeholder="ArgoCD API token" {...register("token")} />
        {errors.token?.message && (
          <p className="text-xs text-destructive">{errors.token.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Connect"}
        </Button>
      </div>
    </form>
  );
});

const CircleCIConnectForm = memo(function CircleCIConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CircleCIFormValues>({ resolver: zodResolver(circleCISchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="circleci-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="circleci-name" placeholder="e.g. My CircleCI" {...register("name")} />
        {errors.name?.message && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="circleci-token" className="text-sm font-medium">
          Token <span className="text-destructive">*</span>
        </label>
        <Input id="circleci-token" type="password" placeholder="CircleCI API token" {...register("token")} />
        {errors.token?.message && (
          <p className="text-xs text-destructive">{errors.token.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Connect"}
        </Button>
      </div>
    </form>
  );
});

const JenkinsConnectForm = memo(function JenkinsConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JenkinsFormValues>({ resolver: zodResolver(jenkinsSchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="jenkins-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="jenkins-name" placeholder="e.g. Main Jenkins" {...register("name")} />
        {errors.name?.message && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="jenkins-url" className="text-sm font-medium">
          URL <span className="text-destructive">*</span>
        </label>
        <Input id="jenkins-url" placeholder="https://jenkins.example.com" {...register("url")} />
        {errors.url?.message && (
          <p className="text-xs text-destructive">{errors.url.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="jenkins-username" className="text-sm font-medium">
          Username <span className="text-destructive">*</span>
        </label>
        <Input id="jenkins-username" placeholder="admin" {...register("username")} />
        {errors.username?.message && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="jenkins-apiToken" className="text-sm font-medium">
          API Token <span className="text-destructive">*</span>
        </label>
        <Input id="jenkins-apiToken" type="password" placeholder="Jenkins API token" {...register("apiToken")} />
        {errors.apiToken?.message && (
          <p className="text-xs text-destructive">{errors.apiToken.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Connect"}
        </Button>
      </div>
    </form>
  );
});

const TravisCIConnectForm = memo(function TravisCIConnectForm({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TravisCIFormValues>({ resolver: zodResolver(travisCISchema) });

  return (
    <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="travis-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <Input id="travis-name" placeholder="e.g. Travis CI OSS" {...register("name")} />
        {errors.name?.message && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="travis-token" className="text-sm font-medium">
          Token <span className="text-destructive">*</span>
        </label>
        <Input id="travis-token" type="password" placeholder="Travis CI API token" {...register("token")} />
        {errors.token?.message && (
          <p className="text-xs text-destructive">{errors.token.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="travis-url" className="text-sm font-medium">
          URL{" "}
          <span className="font-normal text-muted-foreground">(optional, for self-hosted)</span>
        </label>
        <Input
          id="travis-url"
          placeholder="https://travis.example.com"
          {...register("url")}
        />
        {errors.url?.message && (
          <p className="text-xs text-destructive">{errors.url.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Connect"}
        </Button>
      </div>
    </form>
  );
});

// ---------------------------------------------------------------------------
// Single integration card
// ---------------------------------------------------------------------------

interface IntegrationCardProps {
  type: IntegrationType;
  label: string;
  icon: string;
  description: string;
  credential: IntegrationCredential | undefined;
  onConnect: (type: IntegrationType) => void;
  onDisconnect: (credential: IntegrationCredential) => void;
  isDisconnecting: boolean;
}

const IntegrationCard = memo(function IntegrationCard({
  type,
  label,
  icon,
  description,
  credential,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: IntegrationCardProps) {
  const isConnected = !!credential;

  return (
    <Card data-testid={`integration-card-${type}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {icon}
            </span>
            <div>
              <CardTitle className="text-base font-semibold">{label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          {/* Connection status badge */}
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected && credential ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Connected as <span className="font-medium text-foreground">{credential.name}</span>
            </p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDisconnect(credential)}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => onConnect(type)}>
              Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Connect modal
// ---------------------------------------------------------------------------

interface ConnectModalProps {
  type: IntegrationType;
  label: string;
  onSave: (type: IntegrationType, data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}

const ConnectModal = memo(function ConnectModal({ type, label, onSave, onClose, isPending }: ConnectModalProps) {
  const formProps = {
    onSave: (data: Record<string, unknown>) => onSave(type, data),
    onClose,
    isPending,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Connect ${label}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative z-10 bg-background rounded-xl p-6 w-full max-w-md shadow-xl border mx-4">
        <h2 className="text-lg font-semibold mb-4">Connect {label}</h2>
        {type === "argocd" && <ArgoCDConnectForm {...formProps} />}
        {type === "circleci" && <CircleCIConnectForm {...formProps} />}
        {type === "jenkins" && <JenkinsConnectForm {...formProps} />}
        {type === "travisci" && <TravisCIConnectForm {...formProps} />}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function IntegrationSettingsClient() {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<IntegrationType | null>(null);

  // ------ Queries ------

  const { data: credentials = [] } = useQuery({
    queryKey: ["integration-credentials"],
    queryFn: () => integrationsApi.credentials.list(),
  });

  // ------ Mutations ------

  const createMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) =>
      integrationsApi.credentials.create(dto),
    onSuccess: (created) => {
      toast.success(`${created.name} connected successfully`);
      void queryClient.invalidateQueries({ queryKey: ["integration-credentials"] });
      setModalType(null);
    },
    onError: () => {
      toast.error("Failed to save credential. Please try again.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.credentials.remove(id),
    onSuccess: () => {
      toast.success("Integration disconnected");
      void queryClient.invalidateQueries({ queryKey: ["integration-credentials"] });
    },
    onError: () => {
      toast.error("Failed to disconnect integration. Please try again.");
    },
  });

  // ------ Helpers ------

  const getCredentialForType = useCallback(
    (type: IntegrationType): IntegrationCredential | undefined =>
      credentials.find((c) => c.type === type),
    [credentials],
  );

  const handleConnect = useCallback((type: IntegrationType) => {
    setModalType(type);
  }, []);

  const handleDisconnect = useCallback(
    (credential: IntegrationCredential) => {
      removeMutation.mutate(credential.id);
    },
    [removeMutation],
  );

  const handleSave = useCallback(
    (type: IntegrationType, data: Record<string, unknown>) => {
      createMutation.mutate({ type, ...data });
    },
    [createMutation],
  );

  const activeIntegration = useMemo(
    () => (modalType ? INTEGRATIONS.find((i) => i.type === modalType) : null),
    [modalType],
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integration Settings</h1>
        <p className="text-muted-foreground mt-1">
          Connect external CI/CD tools to Farm to see pipeline status alongside your
          components.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <ErrorBoundary key={integration.type}>
            <IntegrationCard
              type={integration.type}
              label={integration.label}
              icon={integration.icon}
              description={integration.description}
              credential={getCredentialForType(integration.type)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isDisconnecting={removeMutation.isPending}
            />
          </ErrorBoundary>
        ))}
      </div>

      {/* Connect modal */}
      {modalType && activeIntegration && (
        <ConnectModal
          type={modalType}
          label={activeIntegration.label}
          onSave={handleSave}
          onClose={() => setModalType(null)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}
