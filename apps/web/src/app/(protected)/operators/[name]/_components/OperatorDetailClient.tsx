"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { kubernetes, catalog } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  OperatorInfo,
  CustomResourceInstance,
  OperatorBinding,
  CatalogComponent,
} from "@/types/api";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft } from "lucide-react";

// Phase badge colour mapping.
function phaseBadgeClass(phase: string): string {
  switch (phase.toLowerCase()) {
    case "succeeded":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "failed":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "pending":
    case "installing":
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    default:
      return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  }
}

// Condition status badge.
function conditionBadge(status: string) {
  if (status === "True")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {status}
      </span>
    );
  if (status === "False")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {status}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status}
    </span>
  );
}

export function OperatorDetailClient() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const operatorName = decodeURIComponent(params.name ?? "");

  const [selectedComponentId, setSelectedComponentId] = useState("");

  // Fetch operator details
  const {
    data: operator,
    isLoading: operatorLoading,
  } = useQuery({
    queryKey: ["operator", operatorName],
    queryFn: () => kubernetes.getOperator(operatorName),
    enabled: !!operatorName,
  });

  // Fetch custom resources for this operator
  const { data: customResources = [] } = useQuery({
    queryKey: ["operator-custom-resources", operatorName],
    queryFn: () => kubernetes.listOperatorCustomResources(operatorName),
    enabled: !!operatorName,
  });

  // Fetch bindings for this operator
  const { data: bindings = [] } = useQuery({
    queryKey: ["operator-bindings", operatorName],
    queryFn: () => kubernetes.listOperatorBindings(operatorName),
    enabled: !!operatorName,
  });

  // Fetch catalog components for binding dropdown
  const { data: componentsData } = useQuery({
    queryKey: ["catalog-components-for-binding"],
    queryFn: () => catalog.listComponents(),
  });
  const allComponents: CatalogComponent[] = componentsData?.data ?? [];

  // Create binding mutation
  const createBindingMutation = useMutation({
    mutationFn: (componentId: string) =>
      kubernetes.createOperatorBinding(operatorName, {
        operatorNamespace: operator?.namespace ?? "operators",
        componentId,
      }),
    onSuccess: () => {
      toast.success("Operator binding created");
      setSelectedComponentId("");
      void queryClient.invalidateQueries({
        queryKey: ["operator-bindings", operatorName],
      });
    },
    onError: () => toast.error("Failed to create binding"),
  });

  // Remove binding mutation
  const removeBindingMutation = useMutation({
    mutationFn: (binding: OperatorBinding) =>
      kubernetes.removeOperatorBinding(operatorName, {
        operatorNamespace: binding.operatorNamespace,
        componentId: binding.componentId,
      }),
    onSuccess: () => {
      toast.success("Operator binding removed");
      void queryClient.invalidateQueries({
        queryKey: ["operator-bindings", operatorName],
      });
    },
    onError: () => toast.error("Failed to remove binding"),
  });

  if (operatorLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!operator) {
    return (
      <EmptyState
        title="Operator Not Found"
        description="The operator you are looking for does not exist."
      >
        <Button variant="outline" onClick={() => router.push("/operators")}>
          Back to Operators
        </Button>
      </EmptyState>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={operator.displayName}
          description={operator.description || "No description provided."}
        >
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={phaseBadgeClass(operator.phase)}
            >
              {operator.phase}
            </Badge>
            <Badge variant="outline">v{operator.version}</Badge>
            {operator.provider && (
              <Badge variant="outline">{operator.provider}</Badge>
            )}
            <Link href="/operators">
              <Button variant="outline" size="sm">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </PageHeader>

        <Tabs defaultValue="custom-resources">
          <TabsList>
            <TabsTrigger value="custom-resources">
              Custom Resources
            </TabsTrigger>
            <TabsTrigger value="crds">CRDs</TabsTrigger>
            <TabsTrigger value="bindings">Bindings</TabsTrigger>
          </TabsList>

          {/* ── Custom Resources tab ───────────────────────────────────── */}
          <TabsContent value="custom-resources">
            {customResources.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                No custom resource instances found for this operator.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customResources.map((cr: CustomResourceInstance) => (
                    <TableRow key={`${cr.namespace}/${cr.name}`}>
                      <TableCell className="font-medium">{cr.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cr.namespace}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cr.kind}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cr.conditions?.map((c) => (
                            <span key={c.type} title={c.message}>
                              {conditionBadge(c.status)}
                            </span>
                          )) ?? (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(cr.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* ── CRDs tab ───────────────────────────────────────────────── */}
          <TabsContent value="crds">
            {operator.customResourceDefinitions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                No custom resource definitions owned by this operator.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operator.customResourceDefinitions.map((crd) => (
                    <TableRow key={crd.name}>
                      <TableCell className="font-medium">{crd.kind}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {crd.name}
                      </TableCell>
                      <TableCell>{crd.version}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {crd.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* ── Bindings tab ───────────────────────────────────────────── */}
          <TabsContent value="bindings">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Linked Components
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing bindings */}
                {bindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No catalog components linked to this operator.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bindings.map((b: OperatorBinding) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <span className="font-medium">
                            {b.component?.name ?? b.componentId}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {b.operatorNamespace}
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBindingMutation.mutate(b)}
                          disabled={removeBindingMutation.isPending}
                        >
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add binding */}
                {hasRole("admin") && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={selectedComponentId}
                      onChange={(e) => setSelectedComponentId(e.target.value)}
                    >
                      <option value="">Select component...</option>
                      {allComponents.map((c: CatalogComponent) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() =>
                        selectedComponentId &&
                        createBindingMutation.mutate(selectedComponentId)
                      }
                      disabled={
                        !selectedComponentId ||
                        createBindingMutation.isPending
                      }
                      size="sm"
                    >
                      Link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
