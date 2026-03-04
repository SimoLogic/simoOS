import { Suspense } from "react";
import { getPlaybookDesigners, getExternalRoles } from "@/lib/actions/playbook/setup";
import { SetupClient } from "./SetupClient";

export default async function PlaybookSetupPage({
    searchParams,
}: {
    searchParams: { tenant_id?: string };
}) {
    const tenantId = searchParams.tenant_id;

    if (!tenantId) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-gray-500">
                Please select a Tenant to configure Playbooks.
            </div>
        );
    }

    // Fetch initial data server-side
    const [designersData, externalRolesData] = await Promise.all([
        getPlaybookDesigners(tenantId),
        getExternalRoles(tenantId),
    ]);

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-5xl space-y-6">

                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold text-[#002B5B]">Playbook Designer Setup</h1>
                        <p className="text-sm text-gray-500">
                            Configure global settings, permitted designers, and external roles for the SIMO Intellisense execution motor.
                        </p>
                    </div>

                    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-white" />}>
                        <SetupClient
                            initialDesigners={(designersData.data || []).map((d: any) => ({
                                ...d,
                                dim_employee: Array.isArray(d.dim_employee) ? d.dim_employee[0] : d.dim_employee,
                            }))}
                            initialExternalRoles={externalRolesData.data || []}
                            tenantId={tenantId}
                        />
                    </Suspense>

                </div>
            </div>
        </div>
    );
}
