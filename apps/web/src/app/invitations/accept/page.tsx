import { Suspense } from "react";
import InvitationAcceptClient from "./_components/InvitationAcceptClient";

export const metadata = {
  title: "Accept invitation — Farm",
};

export default function InvitationAcceptPage() {
  return (
    <Suspense>
      <InvitationAcceptClient />
    </Suspense>
  );
}
