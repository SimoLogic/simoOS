import { Suspense } from "react";
import { getContraPlaybookTasks } from "@/lib/actions/playbook/contra-playbook";
import { InboxClient } from "./InboxClient";
import { Inbox } from "lucide-react";

export default async function ContraPlaybookPage({
    searchParams,
}: {
    searchParams: { tenant_id?: string; employee_id?: string };
}) {
    const tenantId = searchParams.tenant_id;
    const employeeId = searchParams.employee_id || 'EMP001'; // Simulated login

    if (!tenantId) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-gray-500">
                Please select a Tenant to view your Inbox.
            </div>
        );
    }

    const { data: tasks = [] } = await getContraPlaybookTasks(tenantId, employeeId);

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-5xl space-y-6">

                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#002B5B] text-white shadow-sm">
                            <Inbox className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#002B5B]">Contra-Playbook Inbox</h1>
                            <p className="text-sm text-gray-500">
                                Tasks assigned to you as support for active Playbooks operations.
                            </p>
                        </div>
                    </div>

                    {/* Inbox UI */}
                    <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-xl bg-white shadow-sm" />}>
                        <InboxClient initialTasks={tasks || []} />
                    </Suspense>

                </div>
            </div>
        </div>
    );
}
