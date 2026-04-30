"use client";

// Phase 37 — Self-serve user signup (FARM-S358 / T408).
//
// Public route at /signup. The form mirrors the visual style of /login:
// two-column layout on desktop with the brand panel on the left and the
// signup card on the right. Mobile uses the single-column card.
//
// On success → redirect to `/login?registered=1`. The login page reads
// the `registered=1` query param and shows a "Account created" banner.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, auth } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Zod schema — mirrors backend validation:
//   username: regex ^[a-zA-Z0-9_-]+$, min 3
//   email: valid email
//   password: min 8 chars
//   confirmPassword: must match
// ---------------------------------------------------------------------------
const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Only letters, numbers, underscore and hyphen are allowed",
      ),
    email: z.string().email("Invalid email address"),
    displayName: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // When the signup is reached from an invitation accept page we forward the
  // invite token through to login so the user can immediately accept it.
  const inviteToken = searchParams.get("invite");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await auth.register({
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        displayName: values.displayName?.trim() || undefined,
      });

      // Success — redirect to login page with a "registered" banner.
      // Forward the invite token (if any) so the user lands back on the
      // accept-invite page after they sign in.
      const params = new URLSearchParams({ registered: "1" });
      if (inviteToken) {
        params.set(
          "redirect",
          `/invitations/accept?token=${encodeURIComponent(inviteToken)}`,
        );
      }
      router.push(`/login?${params.toString()}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("root", { message: "Email or username already exists" });
        } else {
          setError("root", { message: err.message });
        }
      } else {
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (desktop) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-brand-gradient">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 bg-dot-grid"
        />
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-primary-foreground">
            Farm
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Create your account
          </p>
          <p className="mt-6 text-sm text-primary-foreground/60 max-w-xs leading-relaxed">
            Join Farm to manage services, pipelines, environments, and teams in
            one place.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-sm shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>
              Sign up for Farm — The Full Stack Platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              {errors.root?.message && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                >
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
                  placeholder="alice"
                  autoComplete="username"
                  autoFocus
                  {...register("username")}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? "signup-username-error" : undefined}
                />
                {errors.username?.message && (
                  <p id="signup-username-error" role="alert" aria-live="polite" className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alice@company.com"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "signup-email-error" : undefined}
                />
                {errors.email?.message && (
                  <p id="signup-email-error" role="alert" aria-live="polite" className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display name{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Alice Doe"
                  autoComplete="name"
                  {...register("displayName")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "signup-password-error" : undefined}
                />
                {errors.password?.message && (
                  <p id="signup-password-error" role="alert" aria-live="polite" className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "signup-confirmPassword-error" : undefined}
                />
                {errors.confirmPassword?.message && (
                  <p id="signup-confirmPassword-error" role="alert" aria-live="polite" className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
