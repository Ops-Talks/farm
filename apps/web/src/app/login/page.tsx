"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-client";
import { Github } from "lucide-react";

// ---------------------------------------------------------------------------
// Zod schema — both fields are required
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.username, values.password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError("root", { message: err.message });
      } else {
        setError("root", { message: "An unexpected error occurred" });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Farm</CardTitle>
          <CardDescription>Sign in to the developer portal</CardDescription>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
