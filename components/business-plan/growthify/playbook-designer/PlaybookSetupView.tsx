"use client";

import { useEffect, useState } from "react";
import { getPlaybookDesigners, getExternalRoles } from "@/lib/actions/playbook/setup";
import { SetupClient } from "@/app/(dashboard)/growthify/playbook-designer/setup/SetupClient";
import { Loader2 } from "lucide-react";

interface Props {
    tenantId: string;
}

export function PlaybookSetupView({ tenantId }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [designers, setDesigners] = useState<any[]>([]);
    const [externalRoles, setExternalRoles] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const [designersData, rolesData] = await Promise.all([
                getPlaybookDesigners(tenantId),
                getExternalRoles(tenantId),
            ]);
            setDesigners(designersData.data || []);
            setExternalRoles(rolesData.data || []);
            setIsLoading(false);
        };
        load();
    }, [tenantId]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#002B5B]" />
            </div>
        );
    }

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
                    <SetupClient
                        initialDesigners={designers}
                        initialExternalRoles={externalRoles}
                        tenantId={tenantId}
                    />
                </div>
            </div>
        </div>
    );
}
