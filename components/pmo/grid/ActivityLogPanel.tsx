"use client";

import React, { useEffect, useState } from "react";
import { getTaskActivityLogsAction, ActivityLog } from "@/app/actions/pmo/activity-actions";
import { Loader2, Clock, CheckCircle2, Type } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

export function ActivityLogPanel({ tenantId, taskId }: { tenantId: string, taskId: string }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchLogs() {
            setLoading(true);
            const res = await getTaskActivityLogsAction(tenantId, taskId);
            if (isMounted) {
                if (res.success && res.data) {
                    setLogs(res.data);
                }
                setLoading(false);
            }
        }
        fetchLogs();
        return () => { isMounted = false; };
    }, [tenantId, taskId]);

    if (loading) {
        return (
            <div className="flex w-full py-8 items-center justify-center text-vibe-blue">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="py-6 text-center">
                <p className="text-gray-400 text-sm font-medium">No activity log found yet.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />
            {logs.map((log, idx) => {
                const isStatus = log.actionType === "STATUS_CHANGE";
                const isTitle = log.actionType === "TITLE_CHANGE";
                
                return (
                    <div key={log.id} className="relative flex items-start gap-4 z-10">
                        <div className="shrink-0 mt-1 relative z-10 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center bg-gray-50 shadow-sm">
                            {isStatus ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Type className="w-4 h-4 text-vibe-blue" />}
                        </div>
                        
                        <div className="flex flex-col bg-white border border-gray-100 p-3 rounded-lg shadow-sm w-full">
                            <p className="text-sm font-medium text-vibe-dark">
                                {log.userEmail}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {isStatus && (
                                    <>
                                        Changed status from <span className="font-semibold">{log.oldValue || "none"}</span> to <span className="font-semibold text-vibe-dark">{log.newValue}</span>
                                    </>
                                )}
                                {isTitle && (
                                    <>
                                        Changed title from <span className="line-through">{log.oldValue}</span> to <span className="font-semibold text-vibe-dark">{log.newValue}</span>
                                    </>
                                )}
                                {!isStatus && !isTitle && (
                                    <span>Performed a {log.actionType}</span>
                                )}
                            </p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                <Clock className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: enUS })}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
