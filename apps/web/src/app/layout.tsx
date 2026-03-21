import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { TracingInit } from "@/components/tracing-init";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${dmMono.variable} antialiased`}
      >
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
