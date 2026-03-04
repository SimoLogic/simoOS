"use client";

import { useEffect, useState } from "react";
import { getPlaybookDraft, getSetupDictionaries } from "@/lib/actions/playbook/editor";
import { EditorClient } from "@/app/(dashboard)/growthify/playbook-designer/editor/[id]/EditorClient";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Props {
    playbookId: string;
    tenantId: string;
    onBack: () => void;
}

export function PlaybookEditorView({ playbookId, tenantId, onBack }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [initialData, setInitialData] = useState<any>(null);
    const [dictionaries, setDictionaries] = useState<any>(null);
    const isNew = playbookId === "new";

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const [dictData] = await Promise.all([
                getSetupDictionaries(tenantId),
            ]);
            if (!isNew) {
                const { data } = await getPlaybookDraft(playbookId);
                setInitialData(data);
            }
            setDictionaries(dictData);
            setIsLoading(false);
        };
        load();
    }, [playbookId, tenantId, isNew]);

    return (
        <div className="flex h-full flex-col bg-gray-50">
            {/* Top Banner */}
            <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-6 gap-4">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-900 transition-colors" title="Back to Directory">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-sm font-bold text-[#002B5B]">
                        {isNew ? "New Playbook" : "Edit Playbook"}
                    </h1>
                    <p className="text-xs text-gray-400">Playbook Designer → Editor</p>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#002B5B]" />
                    </div>
                ) : (
                    <EditorClient
                        tenantId={tenantId}
                        initialData={initialData}
                        dictionaries={dictionaries}
                        isNew={isNew}
                    />
                )}
            </div>
        </div>
    );
}
