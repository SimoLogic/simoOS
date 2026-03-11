// ⚠️ Lee ARCHITECTURE.md antes de modificar
// PMO Module root — redirects to my-plan by default
// Future: show workspace selector or My Work overview

import { redirect } from "next/navigation";

export default function PmoPage() {
    redirect("/pmo/my-plan");
}
