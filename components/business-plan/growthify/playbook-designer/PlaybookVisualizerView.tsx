"use client";

import { useEffect, useState } from "react";
import { getPlaybookNodes } from "@/lib/actions/playbook/visualizer";
import { VisualizerClient } from "@/app/(dashboard)/growthify/playbook-designer/visualizer/VisualizerClient";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Props {
    playbookId: string;
    tenantId: string;
    onBack: () => void;
}

export function PlaybookVisualizerView({ playbookId, tenantId, onBack }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (!playbookId) return;
        setIsLoading(true);
        getPlaybookNodes(playbookId).then(({ success, nodes: n, edges: e, title: t }) => {
            if (success && n) {
                setNodes(n);
                setEdges(e || []);
                setTitle(t || "Playbook");
            }
            setIsLoading(false);
        });
    }, [playbookId]);

    return (
        <div className="flex h-full flex-col">
            {/* Top Banner */}
            <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6 gap-4">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                    title="Back to Directory"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-sm font-bold text-[#002B5B]">Canvas Mode: {title}</h1>
                    <p className="text-xs text-gray-400">Playbook Designer → Visualizer</p>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative min-h-0">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#002B5B]" />
                    </div>
                ) : (
                    <VisualizerClient initialNodes={nodes} initialEdges={edges} />
                )}
            </div>
        </div>
    );
}
