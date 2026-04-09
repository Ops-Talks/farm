"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState, type ReactNode, type ElementType } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MenuIcon,
  BarChart2,
  LayoutDashboard,
  BookOpen,
  Rocket,
  GitPullRequest,
  Bell,
  FileText,
  List,
  Activity,
  Building2,
  Users,
  Puzzle,
  Link2,
  Cloud,
  KeyRound,
  ShieldCheck,
  Tag,
  Target,
  AlertTriangle,
  LayoutGrid,
  Layers,
  ServerCog,
  Cpu,
  GitBranch,
  UserCircle,
} from "lucide-react";
import { OrgSwitcher } from "@/components/layout/org-switcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalog", label: "Catalog", icon: BookOpen },
  { href: "/deployments", label: "Deployments", icon: Rocket },
  { href: "/pipelines", label: "Pipelines", icon: GitPullRequest },
  { href: "/alerting-rules", label: "Alerting", icon: Bell },
  { href: "/slos", label: "SLOs", icon: Target },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/queues", label: "Queues", icon: List },
  { href: "/observability", label: "Observability", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/integrations/settings", label: "Integrations", icon: Link2 },
  { href: "/integrations/cloud", label: "Cloud Providers", icon: Cloud },
  { href: "/integrations/keycloak", label: "Keycloak SSO", icon: KeyRound },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/compliance/policies", label: "Tag Policies", icon: Tag },
  { href: "/operators", label: "Operators", icon: Cpu },
  { href: "/gitops", label: "GitOps", icon: GitBranch },
  { href: "/custom-dashboards", label: "Custom Dashboards", icon: LayoutGrid },
  { href: "/service-templates", label: "Templates", icon: Layers },
  { href: "/environment-requests", label: "Env Requests", icon: ServerCog },
] as { href: string; label: string; icon?: ElementType }[];

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const Breadcrumbs = memo(function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          {c.isLast ? (
            // Final segment: prominent foreground + medium weight (FARM-S166)
            <span className="text-foreground font-medium">{c.label}</span>
          ) : (
            // Non-final: muted, hover transitions to foreground
            <Link
              href={c.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
});

// Shared nav item — renders a single <Link> (anchor) with button-like styling.
// Using buttonVariants on the Link avoids the invalid <a><button> nesting.
const NavItem = memo(function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: { href: string; label: string; icon?: ElementType };
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start gap-2 rounded-md px-3 py-2 h-auto text-sm border-l-2",
        isActive
          ? "border-l-primary border-t-transparent border-r-transparent border-b-transparent bg-primary/10 text-primary font-medium hover:bg-primary/15"
          : "border-transparent hover:bg-muted text-foreground/80",
      )}
    >
      {item.icon && (
        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {item.label}
    </Link>
  );
});

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // Controls the mobile hamburger Sheet open/close state (ST188)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Longest-prefix-wins: among all nav items whose href is a prefix of the
  // current pathname, pick the one with the most specific (longest) href.
  // This prevents /compliance from staying active when /compliance/policies is open.
  const activeHref = useMemo(
    () =>
      [...navItems]
        .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href,
    [pathname],
  );

  const cycleTheme = useCallback(() => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }, [theme, setTheme]);

  const themeLabel = useMemo(
    () => (theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"),
    [theme],
  );

  return (
    <div className="flex min-h-screen">
      {/* ST185 – Skip-to-content link: visually hidden until focused by keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* ST183 – Sidebar: landmark role + aria-label so screen readers identify it */}
      <aside
        aria-label="Sidebar"
        className="hidden w-56 flex-col border-r bg-sidebar md:flex"
      >
        {/* Brand header */}
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="text-lg font-bold text-foreground">
            Farm
          </Link>
        </div>
        <Separator />
        {/* FARM-S86 — Organization switcher sits between brand and nav links */}
        <div className="px-2 py-2">
          <OrgSwitcher />
        </div>
        <Separator />
        {/* ST183 – Desktop main nav with descriptive aria-label */}
        <nav
          aria-label="Main navigation"
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2"
        >
          {navItems.map((item) => {
            const isActive = activeHref === item.href;
            return <NavItem key={item.href} item={item} isActive={isActive} />;
          })}
        </nav>
      </aside>

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: h-16 (slightly taller), explicit bottom border (FARM-S166) */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          {/* ST188 – Mobile: hamburger trigger + brand mark */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation menu"
                    className="md:hidden"
                  />
                }
              >
                <MenuIcon className="h-5 w-5" />
              </SheetTrigger>

              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b px-4 py-3">
                  <SheetTitle>Farm</SheetTitle>
                </SheetHeader>
                {/* FARM-S86 — org switcher in mobile nav */}
                <div className="border-b px-2 py-2">
                  <OrgSwitcher />
                </div>
                {/* ST183 – Mobile nav */}
                <nav
                  aria-label="Mobile navigation"
                  className="flex flex-col gap-0.5 p-2"
                >
                  {navItems.map((item) => {
                    const isActive = activeHref === item.href;
                    return (
                      <NavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Brand stays visible in header even with sheet closed */}
            <Link href="/dashboard" className="text-lg font-bold">
              Farm
            </Link>
          </div>

          {/* Breadcrumbs (desktop only) */}
          <div className="hidden md:block">
            <Breadcrumbs pathname={pathname} />
          </div>

          {/* ST183 – User menu: ring on hover for better affordance (FARM-S166) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted hover:ring-2 hover:ring-ring/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`User menu for ${user?.displayName ?? "user"}`}
            >
              {/* Avatar with primary/10 tint and ring border */}
              <Avatar className="h-7 w-7 ring-1 ring-border">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {user ? getInitials(user.displayName ?? user.username) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm md:inline-block">
                {user?.displayName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Roles: {user?.roles.join(", ")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={cycleTheme}>
                Theme: {themeLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* ST184 – id targets the skip-to-content link above */}
        <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
