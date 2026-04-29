// ⚠️ Lee ARCHITECTURE.md antes de modificar
// PMO — My Plan page (Sprint 0 Shell)
// El motor completo de proyectos tipo Monday.com se construye aquí

import { MyPlanShell } from "@/components/pmo/MyPlan/MyPlanShell";

export const dynamic = "force-dynamic";

export default function MyPlanPage() {
    return <MyPlanShell />;
}

export const metadata = {
    title: "My Plan — PMO | SIMO Intellisense",
    description: "PMO project engine — management of Playbook and personal tasks",
};
