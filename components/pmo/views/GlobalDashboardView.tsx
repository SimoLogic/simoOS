"use client";

import React from "react";
import { DashboardEngine } from "./DashboardEngine";
import { useSessionStore } from "@/lib/session-store";

export function GlobalDashboardView({ panelId }: { panelId: string }) {
  const { tenant_id } = useSessionStore();

  if (!tenant_id) return null;

  return (
    <div className="w-full h-full flex flex-col bg-[#F7F8FA] overflow-y-auto absolute inset-0">
      <DashboardEngine panelId={panelId} orgId={tenant_id} />
    </div>
  );
}

