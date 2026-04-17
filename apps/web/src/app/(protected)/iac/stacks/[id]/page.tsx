import type { Metadata } from "next";
import { IacStackDetailClient } from "./_components/IacStackDetailClient";

export const metadata: Metadata = {
  title: "IaC Stack",
};

export default function IacStackDetailPage() {
  return <IacStackDetailClient />;
}
