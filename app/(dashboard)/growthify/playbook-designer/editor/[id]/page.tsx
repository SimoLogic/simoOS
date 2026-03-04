import { Suspense } from "react";
import { getPlaybookDraft, getSetupDictionaries } from "@/lib/actions/playbook/editor";
import { EditorClient } from "./EditorClient";

export default async function PlaybookEditorPage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams: { tenant_id?: string };
}) {
    const tenantId = searchParams.tenant_id;
    const playbookId = params.id;

    if (!tenantId) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-gray-500">
                Please select a Tenant to edit Playbooks.
            </div>
        );
    }

    const isNew = playbookId === "new";
    let playbookData = null;

    if (!isNew) {
        const { data } = await getPlaybookDraft(playbookId);
        playbookData = data;
    }

    const dictionaries = await getSetupDictionaries(tenantId);

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-white p-8" />}>
                <EditorClient
                    tenantId={tenantId}
                    initialData={playbookData}
                    dictionaries={dictionaries}
                    isNew={isNew}
                />
            </Suspense>
        </div>
    );
}
