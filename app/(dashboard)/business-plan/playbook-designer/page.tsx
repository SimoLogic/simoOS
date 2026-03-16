/**
 * ============================================================================
 * PLAYBOOK DESIGNER — NEXT.JS ROUTE PAGE
 * ============================================================================
 * Route: /business-plan/playbook-designer
 * Module: Business Plan > Playbook Designer
 *
 * This page renders the PlaybookDesignerApp component inside the
 * Business Plan module. The component is fully client-side (uses hooks,
 * drag events, and state).
 * ============================================================================
 */

import { PlaybookDesignerApp } from "@/components/playbook-designer/PlaybookDesignerApp";

export const metadata = {
  title: "Playbook Designer — Business Plan | SIMO Intellisense",
  description:
    "Design tactical playbooks with drag-and-drop operational nodes, BPMN flow inspection, and repeatable activity library.",
};

export default function PlaybookDesignerPage() {
  return <PlaybookDesignerApp />;
}
