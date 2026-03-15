// Server Component — no "use client" needed here.
// All interactive logic (useAuth, useState, useEffect, search, tree navigation,
// create/edit/delete document forms) lives in DocsClient which is a Client
// Component. The DocTree and DocForm sub-components remain co-located in
// _components/ and are imported directly by DocsClient.
import { DocsClient } from "./_components/DocsClient";

export default function DocsPage() {
  return <DocsClient />;
}
