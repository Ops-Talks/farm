import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Software Catalog",
    description:
      "Track and manage all software components, services, libraries, and infrastructure resources in one place.",
    href: "/catalog",
  },
  {
    title: "Deployment Matrix",
    description:
      "Visualize deployment status across all environments with real-time updates.",
    href: "/deployments",
  },
  {
    title: "Team Management",
    description:
      "Organize teams, assign ownership, and manage access across the portal.",
    href: "/teams",
  },
  {
    title: "System Health",
    description:
      "Monitor application health, database status, memory usage, and queue metrics.",
    href: "/dashboard",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <main className="flex w-full max-w-4xl flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Farm
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Open-source developer portal for managing your software catalog,
            deployments, and infrastructure.
          </p>
          <div className="flex gap-3 pt-4">
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
