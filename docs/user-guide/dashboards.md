# Custom Dashboards

Farm allows you to build custom dashboards with configurable widget grids for monitoring and operational visibility. Dashboards combine data from multiple sources into a single view tailored to your team's needs.

## Core Concepts

### Dashboard

A dashboard is a named collection of widgets arranged in a 12-column grid. Each dashboard has a visibility setting controlling who can see it.

### Widget

A widget is a single visual element within a dashboard. Each widget has a type that determines what data it displays and how it is rendered. Widgets are positioned and sized using grid coordinates.

### Visibility

| Value | Description |
|---|---|
| `private` | Only visible to the dashboard owner |
| `workspace` | Visible to all members of the organization |

---

## Managing Dashboards

Navigate to **Custom Dashboards** in the sidebar to see all dashboards.

### Creating a Dashboard

1. Click **Create Dashboard**.
2. Enter a name and optional description.
3. Select visibility: `private` or `workspace`.
4. Click **Create**. You are redirected to the empty dashboard.

### Editing a Dashboard

Click the pencil icon on any dashboard card to update its name, description, or visibility.

### Deleting a Dashboard

Click the trash icon and confirm. All widgets in the dashboard are deleted with it.

---

## Widget Types

Farm supports the following widget types:

| Type | Icon | Description |
|---|---|---|
| **Metric Graph** | Line chart | Time-series metric visualization |
| **Component Health** | Heart pulse | Health status overview for catalog components |
| **Deployment Feed** | Rocket | Recent deployment activity across environments |
| **Queue Status** | List ordered | Queue depth and processing rate |
| **SLO Gauge** | Gauge | Error budget gauge for a specific SLO |
| **Alert Summary** | Bell | Summary of active alerting rules |
| **Team Activity** | Users | Recent activity feed for a team |
| **Uptime Chart** | Clock | Uptime percentage chart over time |

### Adding a Widget

1. On the dashboard detail page, click **Add Widget**.
2. Select the widget type.
3. Enter a title for the widget.
4. Optionally configure widget-specific settings in the config object.
5. Click **Add**. The widget appears in the grid.

### Positioning Widgets

Widgets use a 12-column grid layout. Each widget has:

| Property | Description |
|---|---|
| `gridX` | Horizontal position (0-11) |
| `gridY` | Vertical position (row) |
| `gridW` | Width in grid units (1-12) |
| `gridH` | Height in grid units |

Use the layout update endpoint or drag-and-drop in the UI to reposition widgets.

### Deleting a Widget

Click the close icon on any widget to remove it from the dashboard.

---

## Example Dashboard Layouts

### Operations Overview (12-column grid)

```
┌────────────────────────┬────────────────────────┐
│   Component Health     │   SLO Gauge            │
│   (gridW: 6, gridH: 4)│   (gridW: 6, gridH: 4)│
├────────────────────────┼────────────────────────┤
│   Deployment Feed      │   Alert Summary        │
│   (gridW: 6, gridH: 4)│   (gridW: 6, gridH: 4)│
├─────────────────────────────────────────────────┤
│              Metric Graph (full width)           │
│              (gridW: 12, gridH: 4)               │
└─────────────────────────────────────────────────┘
```

### Team Dashboard

```
┌──────────────────────────────────────────────────┐
│              Team Activity (full width)            │
│              (gridW: 12, gridH: 3)                │
├────────────┬────────────┬────────────────────────┤
│ Queue      │ Uptime     │   Deployment Feed      │
│ (4×4)      │ (4×4)      │   (4×4)                │
└────────────┴────────────┴────────────────────────┘
```

---

## Best Practices

- **Keep dashboards focused.** Create separate dashboards for different concerns (operations, team overview, SLO tracking) rather than one large dashboard.
- **Use workspace visibility** for dashboards the whole team needs. Reserve `private` for personal experimental views.
- **Place the most important widgets at the top** of the grid so they are visible without scrolling.
- **Use full-width metric graphs** for time-series data that benefits from horizontal space.

---

## Related

- [Dashboard API Reference](../api-reference/dashboards.md) for endpoint details and response schemas.
- [SLO Management](slos.md) for creating SLOs that feed the SLO Gauge widget.
- [Observability](observability.md) for metrics and alerting that feed dashboard widgets.
