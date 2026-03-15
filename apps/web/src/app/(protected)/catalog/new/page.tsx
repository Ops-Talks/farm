// Server Component — no "use client" needed here.
// All interactive logic (useState, useRouter, form handlers, YAML/form tabs)
// lives in NewComponentClient which is a Client Component.
import { NewComponentClient } from "./_components/NewComponentClient";

export default function NewComponentPage() {
  return <NewComponentClient />;
}
