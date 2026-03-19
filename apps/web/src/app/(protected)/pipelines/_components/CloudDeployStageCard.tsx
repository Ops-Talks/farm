'use client';

// CloudDeployStageCard — form card for cloud deploy pipeline stages.
// Supports four engine types: aws-ecs, aws-lambda, gcp-cloud-run, azure-container-apps.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Engine types
// ---------------------------------------------------------------------------

export type CloudDeployEngine =
  | 'aws-ecs'
  | 'aws-lambda'
  | 'gcp-cloud-run'
  | 'azure-container-apps';

export const CLOUD_DEPLOY_ENGINES: { value: CloudDeployEngine; label: string }[] = [
  { value: 'aws-ecs', label: 'AWS ECS Deploy' },
  { value: 'aws-lambda', label: 'AWS Lambda Deploy' },
  { value: 'gcp-cloud-run', label: 'GCP Cloud Run Deploy' },
  { value: 'azure-container-apps', label: 'Azure Container Apps Deploy' },
];

// ---------------------------------------------------------------------------
// Zod schemas per engine
// ---------------------------------------------------------------------------

const awsEcsSchema = z.object({
  cluster: z.string().min(1, 'Cluster name is required'),
  service: z.string().min(1, 'Service name is required'),
  image: z.string().min(1, 'Image is required'),
});

const awsLambdaSchema = z.object({
  functionName: z.string().min(1, 'Function name is required'),
  imageUri: z.string().optional().or(z.literal('')),
  s3Bucket: z.string().optional().or(z.literal('')),
  s3Key: z.string().optional().or(z.literal('')),
});

const gcpCloudRunSchema = z.object({
  service: z.string().min(1, 'Service name is required'),
  region: z.string().min(1, 'Region is required'),
  image: z.string().min(1, 'Image is required'),
  projectId: z.string().optional().or(z.literal('')),
});

const azureContainerAppsSchema = z.object({
  resourceGroup: z.string().min(1, 'Resource group is required'),
  appName: z.string().min(1, 'App name is required'),
  image: z.string().min(1, 'Image is required'),
});

type AwsEcsValues = z.infer<typeof awsEcsSchema>;
type AwsLambdaValues = z.infer<typeof awsLambdaSchema>;
type GcpCloudRunValues = z.infer<typeof gcpCloudRunSchema>;
type AzureContainerAppsValues = z.infer<typeof azureContainerAppsSchema>;

export type CloudDeployConfig =
  | (AwsEcsValues & { engine: 'aws-ecs' })
  | (AwsLambdaValues & { engine: 'aws-lambda' })
  | (GcpCloudRunValues & { engine: 'gcp-cloud-run' })
  | (AzureContainerAppsValues & { engine: 'azure-container-apps' });

// ---------------------------------------------------------------------------
// Per-engine sub-forms
// ---------------------------------------------------------------------------

function AwsEcsForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (values: AwsEcsValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AwsEcsValues>({ resolver: zodResolver(awsEcsSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="ecs-cluster" className="text-sm font-medium">
          Cluster <span className="text-destructive">*</span>
        </label>
        <Input id="ecs-cluster" placeholder="my-ecs-cluster" {...register('cluster')} />
        {errors.cluster?.message && (
          <p className="text-xs text-destructive">{errors.cluster.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="ecs-service" className="text-sm font-medium">
          Service <span className="text-destructive">*</span>
        </label>
        <Input id="ecs-service" placeholder="my-service" {...register('service')} />
        {errors.service?.message && (
          <p className="text-xs text-destructive">{errors.service.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="ecs-image" className="text-sm font-medium">
          Image <span className="text-destructive">*</span>
        </label>
        <Input id="ecs-image" placeholder="123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest" {...register('image')} />
        {errors.image?.message && (
          <p className="text-xs text-destructive">{errors.image.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Stage'}
        </Button>
      </div>
    </form>
  );
}

function AwsLambdaForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (values: AwsLambdaValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AwsLambdaValues>({ resolver: zodResolver(awsLambdaSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="lambda-functionName" className="text-sm font-medium">
          Function Name <span className="text-destructive">*</span>
        </label>
        <Input id="lambda-functionName" placeholder="my-lambda-function" {...register('functionName')} />
        {errors.functionName?.message && (
          <p className="text-xs text-destructive">{errors.functionName.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="lambda-imageUri" className="text-sm font-medium">
          Image URI <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="lambda-imageUri" placeholder="123456789012.dkr.ecr.us-east-1.amazonaws.com/my-fn:latest" {...register('imageUri')} />
        {errors.imageUri?.message && (
          <p className="text-xs text-destructive">{errors.imageUri.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="lambda-s3Bucket" className="text-sm font-medium">
          S3 Bucket <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="lambda-s3Bucket" placeholder="my-deployment-bucket" {...register('s3Bucket')} />
      </div>
      <div className="space-y-1">
        <label htmlFor="lambda-s3Key" className="text-sm font-medium">
          S3 Key <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="lambda-s3Key" placeholder="releases/my-fn-v1.0.0.zip" {...register('s3Key')} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Stage'}
        </Button>
      </div>
    </form>
  );
}

function GcpCloudRunForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (values: GcpCloudRunValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GcpCloudRunValues>({ resolver: zodResolver(gcpCloudRunSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="cloudrun-service" className="text-sm font-medium">
          Service <span className="text-destructive">*</span>
        </label>
        <Input id="cloudrun-service" placeholder="my-cloud-run-service" {...register('service')} />
        {errors.service?.message && (
          <p className="text-xs text-destructive">{errors.service.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="cloudrun-region" className="text-sm font-medium">
          Region <span className="text-destructive">*</span>
        </label>
        <Input id="cloudrun-region" placeholder="us-central1" {...register('region')} />
        {errors.region?.message && (
          <p className="text-xs text-destructive">{errors.region.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="cloudrun-image" className="text-sm font-medium">
          Image <span className="text-destructive">*</span>
        </label>
        <Input id="cloudrun-image" placeholder="gcr.io/my-project/my-app:latest" {...register('image')} />
        {errors.image?.message && (
          <p className="text-xs text-destructive">{errors.image.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="cloudrun-projectId" className="text-sm font-medium">
          Project ID <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="cloudrun-projectId" placeholder="my-gcp-project" {...register('projectId')} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Stage'}
        </Button>
      </div>
    </form>
  );
}

function AzureContainerAppsForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (values: AzureContainerAppsValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AzureContainerAppsValues>({
    resolver: zodResolver(azureContainerAppsSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="aca-resourceGroup" className="text-sm font-medium">
          Resource Group <span className="text-destructive">*</span>
        </label>
        <Input id="aca-resourceGroup" placeholder="my-resource-group" {...register('resourceGroup')} />
        {errors.resourceGroup?.message && (
          <p className="text-xs text-destructive">{errors.resourceGroup.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="aca-appName" className="text-sm font-medium">
          App Name <span className="text-destructive">*</span>
        </label>
        <Input id="aca-appName" placeholder="my-container-app" {...register('appName')} />
        {errors.appName?.message && (
          <p className="text-xs text-destructive">{errors.appName.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="aca-image" className="text-sm font-medium">
          Image <span className="text-destructive">*</span>
        </label>
        <Input id="aca-image" placeholder="myregistry.azurecr.io/my-app:latest" {...register('image')} />
        {errors.image?.message && (
          <p className="text-xs text-destructive">{errors.image.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Stage'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main CloudDeployStageCard
// ---------------------------------------------------------------------------

interface CloudDeployStageCardProps {
  engine: CloudDeployEngine;
  onSave: (config: CloudDeployConfig) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function CloudDeployStageCard({
  engine,
  onSave,
  onCancel,
  isPending,
}: CloudDeployStageCardProps) {
  const engineLabel = CLOUD_DEPLOY_ENGINES.find((e) => e.value === engine)?.label ?? engine;

  return (
    <Card data-testid={`cloud-deploy-stage-card-${engine}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{engineLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {engine === 'aws-ecs' && (
          <AwsEcsForm
            onSubmit={(v) => onSave({ ...v, engine: 'aws-ecs' })}
            onCancel={onCancel}
            isPending={isPending}
          />
        )}
        {engine === 'aws-lambda' && (
          <AwsLambdaForm
            onSubmit={(v) => onSave({ ...v, engine: 'aws-lambda' })}
            onCancel={onCancel}
            isPending={isPending}
          />
        )}
        {engine === 'gcp-cloud-run' && (
          <GcpCloudRunForm
            onSubmit={(v) => onSave({ ...v, engine: 'gcp-cloud-run' })}
            onCancel={onCancel}
            isPending={isPending}
          />
        )}
        {engine === 'azure-container-apps' && (
          <AzureContainerAppsForm
            onSubmit={(v) => onSave({ ...v, engine: 'azure-container-apps' })}
            onCancel={onCancel}
            isPending={isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
