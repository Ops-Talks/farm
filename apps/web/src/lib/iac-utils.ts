import type { IacProvider } from "@/types/api";

const PROVIDER_BADGE_CLASSES: Record<string, string> = {
  aws: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  gcp: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  azure: "bg-sky-500/20 text-sky-700 dark:text-sky-400",
  kubernetes: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  mongodb: "bg-green-500/20 text-green-700 dark:text-green-400",
  postgres: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  mysql: "bg-teal-500/20 text-teal-700 dark:text-teal-400",
  github: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
  cloudflare: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
};

const DEFAULT_PROVIDER_BADGE_CLASS =
  "bg-slate-500/20 text-slate-700 dark:text-slate-400";

/**
 * Returns the Tailwind badge class string for a given IaC provider.
 * Falls back to a neutral slate badge for unknown providers.
 */
export function providerBadgeClass(provider: IacProvider): string {
  return PROVIDER_BADGE_CLASSES[provider] ?? DEFAULT_PROVIDER_BADGE_CLASS;
}
