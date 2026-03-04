import { Suspense } from "react";
import { getPlaybooks } from "@/lib/actions/playbook/directory";
import { DirectoryClient } from "./DirectoryClient";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function PlaybookDirectoryPage({
    searchParams,
}: {
    searchParams: { tenant_id?: string };
}) {
    const tenantId = searchParams.tenant_id;

    if (!tenantId) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-gray-500">
                Please select a Tenant to view Playbooks.
            </div>
        );
    }

    const { data: playbooks = [] } = await getPlaybooks(tenantId);

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-7xl space-y-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#002B5B]">Playbook Directory</h1>
                            <p className="text-sm text-gray-500">
                                Master Repository of tactical execution models for your business.
                            </p>
                        </div>

                        <Link
                            href={`/growthify/playbook-designer/editor/new?tenant_id=${tenantId}`}
                            className="group flex flex-none items-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:ring-offset-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Playbook</span>
                        </Link>
                    </div>

                    {/* Directory Table UI */}
                    <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-xl bg-white shadow-sm" />}>
                        <DirectoryClient initialPlaybooks={playbooks || []} />
                    </Suspense>

                </div>
            </div>
        </div>
    );
}
