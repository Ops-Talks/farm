import { Suspense } from "react";
import LoginClient from "./_components/LoginClient";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
