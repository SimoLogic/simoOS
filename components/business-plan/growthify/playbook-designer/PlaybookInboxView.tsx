"use client";

import { useEffect, useState } from "react";
import { getContraPlaybookTasks } from "@/lib/actions/playbook/contra-playbook";
import { InboxClient } from "@/app/(dashboard)/growthify/playbook-designer/contra-playbooks/InboxClient";
import { useTenant } from "@/lib/tenant-context";
import { Inbox, Loader2 } from "lucide-react";

export function PlaybookInboxView() {
    const { currentTenant } = useTenant();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        if (!currentTenant?.tenant_id) return;
        setIsLoading(true);
        // Using a simulated employee ID — in production, pull from auth session
        getContraPlaybookTasks(currentTenant.tenant_id, "EMP001").then(({ data }) => {
            setTasks(data || []);
            setIsLoading(false);
        });
    }, [currentTenant?.tenant_id]);

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
                            <p className="text-sm text-gray-500">Tasks assigned to you as support for active Playbook operations.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-[#002B5B]" />
                        </div>
                    ) : (
                        <InboxClient initialTasks={tasks} />
                    )}
                </div>
            </div>
        </div>
    );
}
