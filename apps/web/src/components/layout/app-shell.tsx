"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
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
import { MenuIcon } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/catalog", label: "Catalog" },
  { href: "/deployments", label: "Deployments" },
  { href: "/docs", label: "Docs" },
  { href: "/queues", label: "Queues" },
  { href: "/observability", label: "Observability" },
  { href: "/teams", label: "Teams" },
];

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {c.isLast ? (
            <span className="text-foreground font-medium">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  // Controls the mobile hamburger Sheet open/close state (ST188)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const themeLabel =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

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
      <aside aria-label="Sidebar" className="hidden w-56 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="text-lg font-bold">
            Farm
          </Link>
        </div>
        <Separator />
        {/* ST183 – Desktop main nav with descriptive aria-label */}
        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                {/* ST183 – aria-current marks the active page for screen readers */}
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          {/* ST188 – Mobile: hamburger trigger + brand mark (Sheet houses the full nav) */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              {/* render prop merges Sheet trigger behaviour into our Button element */}
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
                {/* ST183 – Mobile nav with dedicated aria-label */}
                <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-2">
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Brand link stays visible in header so users can navigate home with sheet closed */}
            <Link href="/dashboard" className="text-lg font-bold">
              Farm
            </Link>
          </div>

          {/* Breadcrumbs (desktop only) */}
          <div className="hidden md:block">
            <Breadcrumbs pathname={pathname} />
          </div>

          {/* ST183 – User menu with descriptive aria-label */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              aria-label={`User menu for ${user?.displayName ?? "user"}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {user ? getInitials(user.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm md:inline-block">
                {user?.displayName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
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
        <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
