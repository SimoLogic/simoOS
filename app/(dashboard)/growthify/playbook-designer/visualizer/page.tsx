import { Suspense } from "react";
import { getPlaybookNodes } from "@/lib/actions/playbook/visualizer";
import { VisualizerClient } from "./VisualizerClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PlaybookVisualizerPage({
    searchParams,
}: {
    searchParams: { playbook_id?: string; tenant_id?: string };
}) {
    const playbookId = searchParams.playbook_id;
    const tenantId = searchParams.tenant_id;

    if (!playbookId || !tenantId) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-gray-500">
                Missing parameters for Visualizer.
                <Link href={`/growthify/playbook-designer/directory?tenant_id=${tenantId}`} className="ml-2 text-blue-600 underline">Go Back</Link>
            </div>
        );
    }

    const { success, nodes, edges, title } = await getPlaybookNodes(playbookId);

    if (!success || !nodes) {
        return <div className="p-8">Error loading visualizer data.</div>;
    }

    return (
        <div className="flex h-full flex-col bg-slate-50">

            {/* Top Banner */}
            <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6">
                <Link href={`/growthify/playbook-designer/directory?tenant_id=${tenantId}`} className="mr-4 text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-sm font-bold text-[#002B5B]">Canvas Mode: {title}</h1>
                </div>
            </div>

            <div className="flex-1 relative">
                <Suspense fallback={<div className="h-full w-full animate-pulse bg-gray-100" />}>
                    <VisualizerClient initialNodes={nodes} initialEdges={edges} />
                </Suspense>
            </div>

        </div>
    );
}
