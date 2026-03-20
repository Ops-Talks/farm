"use client";

// Two-column login page redesign (FARM-S165):
// - Left panel: Farm branding on deep indigo primary background (desktop only)
// - Right panel: Clean white card with the login form
// - Mobile: single-column, just the card (left panel is visually hidden via CSS)

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-client";
import { Github, ShieldCheck } from "lucide-react";
import { startSpan } from "@/lib/otel-spans";

// ---------------------------------------------------------------------------
// Zod schema — both fields are required
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginClient() {
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // Deep-link org ID from query param: /login?keycloakOrgId=<uuid>
  const keycloakOrgIdParam = searchParams.get("keycloakOrgId") ?? "";
  const keycloakError = searchParams.get("error");

  // Local state for the org ID input shown when no query param is provided
  const [keycloakOrgId, setKeycloakOrgId] = useState(keycloakOrgIdParam);
  const [keycloakOrgIdError, setKeycloakOrgIdError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    // Track the login attempt as an OTel span so we can observe auth success
    // and failure rates in Tempo. Use startSpan (not recordSpan) so that
    // result-dependent attributes can be set after the outcome is known.
    const span = startSpan("auth.login", { "auth.method": "local" });

    try {
      await login(values.username, values.password);
      span.setAttribute("result", "success");
      span.end();
    } catch (err) {
      span.setAttribute("result", "error");

      if (err instanceof ApiError) {
        span.setAttribute("error.message", err.message);
        setError("root", { message: err.message });
      } else {
        const msg = "An unexpected error occurred";
        span.setAttribute("error.message", msg);
        setError("root", { message: msg });
      }

      span.end();
    }
  };

  const handleKeycloakLogin = () => {
    const trimmed = keycloakOrgId.trim();
    if (!trimmed) {
      setKeycloakOrgIdError("Organisation ID is required for Keycloak login");
      return;
    }
    setKeycloakOrgIdError("");
    // Full-page navigation to backend OIDC redirect — same pattern as GitHub/Google
    window.location.href = `/api/v1/auth/keycloak?orgId=${encodeURIComponent(trimmed)}`;
  };

  return (
    // Outer container: two-column on md+, single column on mobile
    <div className="flex min-h-screen">
      {/* ── Left branding panel (desktop only) ─────────────────────────────── */}
      {/* hidden md:flex: display:none on mobile, flex on desktop */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-primary p-12 relative overflow-hidden">
        {/* Subtle dot-grid pattern overlay for depth */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Brand content */}
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-primary-foreground">
            Farm
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            The Full Stack Platform
          </p>
          <p className="mt-6 text-sm text-primary-foreground/60 max-w-xs leading-relaxed">
            Manage services, pipelines, environments, and teams — all in one place.
          </p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-sm shadow-sm">
          <CardHeader className="text-center">
            {/* CardTitle shows "Sign in". The "Farm" brand is in the left panel on desktop.
                On mobile, users see "Sign in" as the page heading (left panel is CSS-hidden). */}
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Sign in to Farm — The Full Stack Platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Root-level error from the API */}
              {errors.root?.message && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.root.message}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  autoFocus
                  className="focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("username")}
                />
                {errors.username?.message && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("password")}
                />
                {errors.password?.message && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              {/* isSubmitting drives both disabled state and button label */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* OAuth social login — backend redirects to provider; no fetch needed */}
            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  or continue with
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {/* Full-page navigation to backend OAuth redirect — must be an <a> tag */}
                <a href="/api/v1/auth/github" className="w-full">
                  <Button variant="outline" className="w-full gap-2" type="button">
                    <Github className="h-4 w-4" />
                    Continue with GitHub
                  </Button>
                </a>

                <a href="/api/v1/auth/google" className="w-full">
                  <Button variant="outline" className="w-full gap-2" type="button">
                    {/* Simple "G" lettermark for Google — no external SVG dependency */}
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 text-[9px] font-black text-white leading-none">
                      G
                    </span>
                    Continue with Google
                  </Button>
                </a>

                {/* ── Keycloak Enterprise SSO (FARM-E41) ───────────────────── */}
                <div className="flex flex-col gap-2">
                  {/* Error banner when the backend reports keycloak_not_configured */}
                  {keycloakError === "keycloak_not_configured" && (
                    <div
                      role="alert"
                      className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      Keycloak SSO is not configured for this organisation. Contact your
                      administrator to set it up.
                    </div>
                  )}

                  {/* Org ID input — pre-filled from deep-link; always visible */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="keycloak-org-id" className="text-xs text-muted-foreground">
                      Organisation ID (for SSO)
                    </label>
                    <Input
                      id="keycloak-org-id"
                      type="text"
                      placeholder="Enter your organisation ID"
                      value={keycloakOrgId}
                      onChange={(e) => {
                        setKeycloakOrgId(e.target.value);
                        setKeycloakOrgIdError("");
                      }}
                      aria-label="Organisation ID"
                      className="focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {keycloakOrgIdError && (
                      <p className="text-xs text-destructive">{keycloakOrgIdError}</p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    type="button"
                    onClick={handleKeycloakLogin}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Login with Keycloak
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
