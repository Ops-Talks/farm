import type { Metadata } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { TracingInit } from "@/components/tracing-init";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} ${inter.variable} ${plusJakartaSans.variable} antialiased`}
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
