"use client";

import React, { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Activity, Clock, Loader2 } from "lucide-react";

interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

interface TaskLogWidgetProps {
  boardId?: string;
  orgId?: string;
}

export const TaskLogWidget: React.FC<TaskLogWidgetProps> = ({ boardId, orgId }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!boardId || !orgId) {
      setLoading(false);
      return;
    }
    async function loadActivity() {
      try {
        const { getPmoDB } = await import("@/lib/pmo/pmo-db");
        const db = getPmoDB();
        const { data } = await db
          .from("pmo_item_activity")
          .select("id, user_id, action, field_name, old_value, new_value, created_at")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(500);

        setLogs(
          (data ?? []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            userId: String(r.user_id ?? ""),
            action: String(r.action ?? ""),
            fieldName: r.field_name ? String(r.field_name) : null,
            oldValue: r.old_value ? String(r.old_value) : null,
            newValue: r.new_value ? String(r.new_value) : null,
            createdAt: String(r.created_at ?? ""),
          }))
        );
      } catch (e) {
        console.error("[TaskLogWidget] Error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [boardId, orgId]);

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-[#6161FF]" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#323338]" />
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Activity</h3>
        </div>
        <div className="bg-[#0086C0]/10 px-2 py-0.5 rounded text-[9px] font-bold text-[#0086C0] uppercase">
          {logs.length} events
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No activity recorded yet</p>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = logs[virtualRow.index];
              const timeAgo = getTimeAgo(log.createdAt);
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 w-full flex items-center gap-3 px-2 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#6161FF]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#323338] truncate">
                      <span className="font-bold">{log.userId}</span>{" "}
                      {log.action}{log.fieldName ? ` on ${log.fieldName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-gray-400 font-medium">
                    <Clock className="w-3 h-3" />
                    {timeAgo}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function getTimeAgo(isoDate: string): string {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
