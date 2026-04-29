import { Suspense } from "react";
import SignupClient from "./_components/SignupClient";

export const metadata = {
  title: "Sign up — Farm",
  description: "Create your Farm account.",
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}
