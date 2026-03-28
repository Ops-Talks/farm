"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { invitations } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type AcceptState = "loading" | "success" | "error";

/**
 * Page component that accepts an organization invitation via the token
 * embedded in the URL.  On success the user is redirected to the home page
 * after a short delay.
 */
export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [state, setState] = useState<AcceptState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("Something went wrong.");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    invitations
      .accept(token)
      .then(() => {
        setState("success");
        setTimeout(() => router.push("/"), 3000);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to accept invitation.";
        setErrorMessage(message);
        setState("error");
      });
  }, [token, router]);

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Accepting invitation…</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold">Invitation accepted!</h2>
        <p className="text-sm text-muted-foreground">
          You have successfully joined the organization. Redirecting…
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Go to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <XCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Unable to accept invitation</h2>
      <p className="text-sm text-muted-foreground">{errorMessage}</p>
      <Button variant="outline" size="sm" onClick={() => router.push("/")}>
        Go to home
      </Button>
    </div>
  );
}
