"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  BarChart3,
  Heart,
  Rocket,
  Inbox,
  Gauge,
  Bell,
  Users,
  Clock,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Grid3X3,
  Eye,
  Lock,
} from "lucide-react";
import { dashboards } from "@/lib/api-client";
import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  WidgetType,
  DashboardVisibility,
} from "@/types/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WIDGET_TYPES: { value: WidgetType; label: string }[] = [
  { value: "metric_graph", label: "Metric Graph" },
  { value: "component_health", label: "Component Health" },
  { value: "deployment_feed", label: "Deployment Feed" },
  { value: "queue_status", label: "Queue Status" },
  { value: "slo_gauge", label: "SLO Gauge" },
  { value: "alert_summary", label: "Alert Summary" },
  { value: "team_activity", label: "Team Activity" },
  { value: "uptime_chart", label: "Uptime Chart" },
];

function widgetIcon(type: WidgetType) {
  switch (type) {
    case "metric_graph":
      return <BarChart3 className="h-4 w-4" />;
    case "component_health":
      return <Heart className="h-4 w-4" />;
    case "deployment_feed":
      return <Rocket className="h-4 w-4" />;
    case "queue_status":
      return <Inbox className="h-4 w-4" />;
    case "slo_gauge":
      return <Gauge className="h-4 w-4" />;
    case "alert_summary":
      return <Bell className="h-4 w-4" />;
    case "team_activity":
      return <Users className="h-4 w-4" />;
    case "uptime_chart":
      return <Clock className="h-4 w-4" />;
  }
}

function widgetTypeLabel(type: WidgetType): string {
  return WIDGET_TYPES.find((t) => t.value === type)?.label ?? type;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardsClient() {
  useAuth();

  /* ---- list state ---- */
  const [dashboardsList, setDashboardsList] = useState<Dashboard[]>([]);
  const [, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ---- create / edit dashboard dialog ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVisibility, setFormVisibility] = useState<DashboardVisibility>("private");
  const [saving, setSaving] = useState(false);

  /* ---- delete dashboard ---- */
  const [deleteTarget, setDeleteTarget] = useState<Dashboard | null>(null);

  /* ---- builder (selected dashboard) ---- */
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);

  /* ---- add widget dialog ---- */
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [widgetType, setWidgetType] = useState<WidgetType>("metric_graph");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [widgetGridX, setWidgetGridX] = useState(0);
  const [widgetGridY, setWidgetGridY] = useState(0);
  const [widgetGridW, setWidgetGridW] = useState(4);
  const [widgetGridH, setWidgetGridH] = useState(3);
  const [widgetConfig, setWidgetConfig] = useState("");
  const [savingWidget, setSavingWidget] = useState(false);

  /* ---- delete widget ---- */
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<DashboardWidget | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Fetch dashboards                                                 */
  /* ---------------------------------------------------------------- */

  const fetchDashboards = useCallback(async () => {
    try {
      const data = await dashboards.list();
      setDashboardsList(data.data);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboards();
  }, [fetchDashboards]);

  /* ---------------------------------------------------------------- */
  /*  Refresh the selected dashboard (after widget changes)            */
  /* ---------------------------------------------------------------- */

  const refreshSelected = useCallback(async (id: string) => {
    try {
      const updated = await dashboards.getOne(id);
      setSelectedDashboard(updated);
      // also update the card in the list
      setDashboardsList((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch {
      toast.error("Failed to refresh dashboard");
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Dashboard CRUD                                                   */
  /* ---------------------------------------------------------------- */

  function openCreateDialog() {
    setEditingDashboard(null);
    setFormName("");
    setFormDescription("");
    setFormVisibility("private");
    setDialogOpen(true);
  }

  function openEditDialog(dashboard: Dashboard) {
    setEditingDashboard(dashboard);
    setFormName(dashboard.name);
    setFormDescription(dashboard.description ?? "");
    setFormVisibility(dashboard.visibility);
    setDialogOpen(true);
  }

  async function handleSaveDashboard() {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingDashboard) {
        const dto: UpdateDashboardDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          visibility: formVisibility,
        };
        const updated = await dashboards.update(editingDashboard.id, dto);
        setDashboardsList((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d)),
        );
        if (selectedDashboard?.id === updated.id) {
          setSelectedDashboard(updated);
        }
        toast.success(`Dashboard "${updated.name}" updated`);
      } else {
        const dto: CreateDashboardDto = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          visibility: formVisibility,
        };
        const created = await dashboards.create(dto);
        setDashboardsList((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
        toast.success(`Dashboard "${created.name}" created`);
      }
      setDialogOpen(false);
    } catch {
      toast.error(
        editingDashboard ? "Failed to update dashboard" : "Failed to create dashboard",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDashboard() {
    if (!deleteTarget) return;
    try {
      await dashboards.remove(deleteTarget.id);
      setDashboardsList((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      if (selectedDashboard?.id === deleteTarget.id) {
        setSelectedDashboard(null);
      }
      toast.success(`Dashboard "${deleteTarget.name}" deleted`);
    } catch {
      toast.error("Failed to delete dashboard");
    } finally {
      setDeleteTarget(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Widget CRUD                                                      */
  /* ---------------------------------------------------------------- */

  function openAddWidgetDialog() {
    setWidgetType("metric_graph");
    setWidgetTitle("");
    setWidgetGridX(0);
    setWidgetGridY(0);
    setWidgetGridW(4);
    setWidgetGridH(3);
    setWidgetConfig("");
    setWidgetDialogOpen(true);
  }

  async function handleSaveWidget() {
    if (!selectedDashboard) return;
    if (!widgetTitle.trim()) {
      toast.error("Widget title is required");
      return;
    }

    let config: Record<string, unknown> | undefined;
    if (widgetConfig.trim()) {
      try {
        config = JSON.parse(widgetConfig.trim());
      } catch {
        toast.error("Config must be valid JSON");
        return;
      }
    }

    setSavingWidget(true);
    try {
      const dto: CreateWidgetDto = {
        type: widgetType,
        title: widgetTitle.trim(),
        gridX: widgetGridX,
        gridY: widgetGridY,
        gridW: widgetGridW,
        gridH: widgetGridH,
        config,
      };
      await dashboards.createWidget(selectedDashboard.id, dto);
      await refreshSelected(selectedDashboard.id);
      setWidgetDialogOpen(false);
      toast.success("Widget added");
    } catch {
      toast.error("Failed to add widget");
    } finally {
      setSavingWidget(false);
    }
  }

  async function handleDeleteWidget() {
    if (!selectedDashboard || !deleteWidgetTarget) return;
    try {
      await dashboards.removeWidget(selectedDashboard.id, deleteWidgetTarget.id);
      await refreshSelected(selectedDashboard.id);
      toast.success("Widget deleted");
    } catch {
      toast.error("Failed to delete widget");
    } finally {
      setDeleteWidgetTarget(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Builder view (selected dashboard)                                */
  /* ---------------------------------------------------------------- */

  if (selectedDashboard) {
    const widgets = selectedDashboard.widgets ?? [];

    return (
      <div className="flex flex-col gap-6">
        {/* Builder header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDashboard(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedDashboard.name}
              </h1>
              {selectedDashboard.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedDashboard.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(selectedDashboard)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button size="sm" onClick={openAddWidgetDialog}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Widget
            </Button>
          </div>
        </div>

        {/* Widget grid */}
        {widgets.length === 0 && (
          <EmptyState
            title="No widgets yet"
            description="Add your first widget to start building this dashboard."
            icon={<Grid3X3 className="h-6 w-6 text-muted-foreground" />}
          >
            <Button className="mt-4" onClick={openAddWidgetDialog}>
              <Plus className="mr-1 h-4 w-4" />
              Add Widget
            </Button>
          </EmptyState>
        )}

        {widgets.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => (
              <Card key={widget.id} size="sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {widgetIcon(widget.type)}
                    </span>
                    <CardTitle>{widget.title}</CardTitle>
                  </div>
                  <CardAction>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteWidgetTarget(widget)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {widgetTypeLabel(widget.type)}
                    </Badge>
                    <span className="font-mono">
                      pos({widget.gridX},{widget.gridY}) size({widget.gridW}×
                      {widget.gridH})
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ---- Add widget dialog ---- */}
        <Dialog open={widgetDialogOpen} onOpenChange={setWidgetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Widget</DialogTitle>
              <DialogDescription>
                Configure a new widget for this dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="widget-type" className="text-sm font-medium">
                  Type
                </label>
                <select
                  id="widget-type"
                  value={widgetType}
                  onChange={(e) => setWidgetType(e.target.value as WidgetType)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {WIDGET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="widget-title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="widget-title"
                  placeholder="Widget title"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="widget-gridX" className="text-sm font-medium">
                    X
                  </label>
                  <Input
                    id="widget-gridX"
                    type="number"
                    min={0}
                    value={widgetGridX}
                    onChange={(e) => setWidgetGridX(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="widget-gridY" className="text-sm font-medium">
                    Y
                  </label>
                  <Input
                    id="widget-gridY"
                    type="number"
                    min={0}
                    value={widgetGridY}
                    onChange={(e) => setWidgetGridY(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="widget-gridW" className="text-sm font-medium">
                    W
                  </label>
                  <Input
                    id="widget-gridW"
                    type="number"
                    min={1}
                    value={widgetGridW}
                    onChange={(e) => setWidgetGridW(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="widget-gridH" className="text-sm font-medium">
                    H
                  </label>
                  <Input
                    id="widget-gridH"
                    type="number"
                    min={1}
                    value={widgetGridH}
                    onChange={(e) => setWidgetGridH(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="widget-config" className="text-sm font-medium">
                  Config (JSON)
                </label>
                <textarea
                  id="widget-config"
                  rows={3}
                  placeholder='{"metric": "cpu_usage"}'
                  value={widgetConfig}
                  onChange={(e) => setWidgetConfig(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setWidgetDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveWidget} disabled={savingWidget}>
                {savingWidget ? "Adding…" : "Add Widget"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Delete widget confirm ---- */}
        <ConfirmDialog
          open={!!deleteWidgetTarget}
          onOpenChange={(open) => !open && setDeleteWidgetTarget(null)}
          title="Delete widget"
          description={`Are you sure you want to delete "${deleteWidgetTarget?.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDeleteWidget}
        />

        {/* ---- Edit dashboard dialog (reused in builder) ---- */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDashboard ? "Edit Dashboard" : "Create Dashboard"}
              </DialogTitle>
              <DialogDescription>
                {editingDashboard
                  ? "Update your dashboard settings."
                  : "Create a new custom dashboard."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dash-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="dash-name"
                  placeholder="Dashboard name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="dash-desc" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="dash-desc"
                  placeholder="Optional description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="dash-visibility" className="text-sm font-medium">
                  Visibility
                </label>
                <select
                  id="dash-visibility"
                  value={formVisibility}
                  onChange={(e) =>
                    setFormVisibility(e.target.value as DashboardVisibility)
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="private">Private</option>
                  <option value="workspace">Workspace</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDashboard} disabled={saving}>
                {saving
                  ? "Saving…"
                  : editingDashboard
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Dashboard list view                                              */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Custom Dashboards"
        description="Build and manage personalized dashboards with configurable widgets."
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Create Dashboard
        </Button>
      </PageHeader>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && dashboardsList.length === 0 && (
        <EmptyState
          title="No dashboards"
          description="Create your first custom dashboard to start monitoring your services."
          icon={<LayoutDashboard className="h-6 w-6 text-muted-foreground" />}
        >
          <Button className="mt-4" onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Create Dashboard
          </Button>
        </EmptyState>
      )}

      {/* Dashboard cards */}
      {!loading && dashboardsList.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardsList.map((dashboard) => (
            <Card
              key={dashboard.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedDashboard(dashboard)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  {dashboard.name}
                </CardTitle>
                <CardAction>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(dashboard);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(dashboard);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardAction>
                {dashboard.description && (
                  <CardDescription>{dashboard.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      dashboard.visibility === "workspace"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {dashboard.visibility === "workspace" ? (
                      <Eye className="mr-1 h-3 w-3" />
                    ) : (
                      <Lock className="mr-1 h-3 w-3" />
                    )}
                    {dashboard.visibility}
                  </Badge>
                  <Badge variant="secondary">
                    <Grid3X3 className="mr-1 h-3 w-3" />
                    {dashboard.widgets?.length ?? 0} widget
                    {(dashboard.widgets?.length ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-muted-foreground">
                  Owner: {dashboard.ownerId.slice(0, 8)}…
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ---- Create / Edit dashboard dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDashboard ? "Edit Dashboard" : "Create Dashboard"}
            </DialogTitle>
            <DialogDescription>
              {editingDashboard
                ? "Update your dashboard settings."
                : "Create a new custom dashboard."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dash-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="dash-name"
                placeholder="Dashboard name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dash-desc" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="dash-desc"
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dash-visibility" className="text-sm font-medium">
                Visibility
              </label>
              <select
                id="dash-visibility"
                value={formVisibility}
                onChange={(e) =>
                  setFormVisibility(e.target.value as DashboardVisibility)
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="private">Private</option>
                <option value="workspace">Workspace</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDashboard} disabled={saving}>
              {saving
                ? "Saving…"
                : editingDashboard
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete dashboard confirm ---- */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete dashboard"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All widgets will be removed. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteDashboard}
      />
    </div>
  );
}
