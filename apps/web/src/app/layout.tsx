import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { TracingInit } from "@/components/tracing-init";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Farm - Developer Portal",
  description:
    "Open-source developer portal for managing software catalog, deployments, and infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <Providers>
          {/* TracingInit bootstraps the OTel browser SDK once on first render.
              It renders null — no DOM impact. */}
          <TracingInit />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
