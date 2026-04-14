/**
 * ============================================================================
 * PLAYBOOK DESIGNER — NEXT.JS ROUTE PAGE
 * ============================================================================
 * Route: /business-plan/playbook-designer
 * Route: /business-plan/playbook-designer?id={uuid}       → Edit mode
 * Route: /business-plan/playbook-designer?duplicate={uuid} → Duplicate mode
 *
 * This page reads URL searchParams and passes them to PlaybookDesignerApp.
 * ============================================================================
 */

import { PlaybookDesignerApp } from "@/components/playbook-designer/PlaybookDesignerApp";

export default function PlaybookDesignerPage({
  searchParams,
}: {
  searchParams: { id?: string; duplicate?: string };
}) {
  return (
    <PlaybookDesignerApp
      initialPlaybookId={searchParams.id ?? null}
      duplicateFromId={searchParams.duplicate ?? null}
    />
  );
}
