---
target: dashboard
total_score: 23
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-06-18T17-12-26Z
slug: apps-web-src-app-protected-dashboard
---
# Design Critique: Dashboard

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good skeletons/toasts; IntegrationHealthCard has no loading state |
| 2 | Match System / Real World | 3 | Appropriate domain terms; "Bull Board" link assumes insider knowledge |
| 3 | User Control and Freedom | 2 | No undo for dismiss actions; no widget customization |
| 4 | Consistency and Standards | 3 | Card language consistent; each widget has its own internal structure |
| 5 | Error Prevention | 2 | No double-trigger guard on pipelines; no confirm on dismiss |
| 6 | Recognition Rather Than Recall | 2 | Integration health uses color-only semantics — no text labels |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts; no bulk actions; no customization |
| 8 | Aesthetic and Minimalist Design | 3 | Clean layout; monotonous section heading pattern across 6 sections |
| 9 | Error Recovery | 3 | Pipeline toasts; HealthPanel retry message; good error boundaries |
| 10 | Help and Documentation | 1 | No contextual help, tooltips, or docs links anywhere on the page |
| **Total** | | **23/40** | **Acceptable** |

## Anti-Patterns Verdict

**Not AI-generated.** The dashboard reads as a real production tool — skeleton loading, WebSocket-driven activity, auto-refresh intervals, and proper error/edge-case handling are genuine engineering decisions. The monotonous section headings ("OVERVIEW", "SYSTEM HEALTH", etc.) are a functional organizational pattern for a dashboard, not a landing-page tell.

## Overall Impression

Solid foundation with anemic power-user features. The dashboard is competent at showing information but does little to help users *act* on it. The weakest component is the QueuePanel (static text with an external link). The biggest missed opportunity is the IntegrationHealthCard using color-only semantics — a genuine accessibility failure in what should be an inclusive tool.

## What's Working

- Real-time ActivityFeed via WebSocket — live data with a cap at 20 items and an educational empty state.
- Consistent skeleton loading + auto-refresh on async widgets (30s health, 60s stats).
- Pipeline trigger flow with disable state and toast success/failure feedback.

## Priority Issues

- **[P1] IntegrationHealthCard: color-only semantics.** Green check / gray X with aria-hidden="true" on both icons. Screen readers get no state information.
- **[P1] QueuePanel: static dead end.** Two hardcoded queue names with no live data. "Open Bull Board" sends users elsewhere.
- **[P2] No dashboard customization or shortcuts.** No keyboard shortcuts, no bulk actions, no widget customization.
- **[P2] Section heading monotony.** Six identical uppercase tracked labels create visual noise.
- **[P3] No contextual help.** No tooltips or docs links anywhere on the page.

## Persona Red Flags

**Alex (Power User)**: No keyboard shortcuts. One-at-a-time pipeline triggers. No batch actions. No dashboard customization. High abandonment risk for daily use.

**Sam (Accessibility)**: IntegrationHealthCard invisible to screen readers. "View all" pipelines link has marginal contrast. Otherwise good heading hierarchy and keyboard nav.

**Riley (Stress Tester)**: ActivityFeed caps at 20 with no overflow indication. SetupChecklist dismiss has no undo. QuickStats silently falls back to 0 on API errors.

## Minor Observations

- QuickStats silently swallows API errors (sets value to 0)
- Pipeline date uses toLocaleDateString() — respects locale, good
- HealthPanel detail cards have no visual hierarchy in key-value pairs
- "View all" links could use arrow icon for better affordance

## Questions to Consider

- Should the QueuePanel carry live metrics or be removed?
- What if users could choose which 3 widgets to pin?
- Does every section need an uppercase label, or could visual dividers do the same job?
