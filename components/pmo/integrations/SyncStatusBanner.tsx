// ⚠️ Lee ARCHITECTURE.md antes de modificar
// integrations/ — Componentes de integración Simo IS para el PMO

"use client";

import React from "react";
import { Zap, RefreshCw, CheckCircle } from "lucide-react";

interface SyncStatusBannerProps {
  lastSyncedAt?: string;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

/**
 * SyncStatusBanner — Banner de estado de sincronización Simo IS
 * 
 * Muestra el estado de la última sincronización HMAC-SHA256 con Simo IS.
 * Implementación de red completa en Sprint 3 (Mirror Sync Protocol).
 */
export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({
  lastSyncedAt,
  isSyncing = false,
  onManualSync,
}) => {
  const formattedDate = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
      style={{ backgroundColor: "#0086C018", color: "#0086C0" }}
    >
      <Zap className="w-3 h-3 flex-shrink-0" />
      <span>
        Simo IS{" "}
        {isSyncing ? (
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Syncing...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Synced · {formattedDate}
          </span>
        )}
      </span>
      {!isSyncing && onManualSync && (
        <button
          onClick={onManualSync}
          className="ml-auto text-[10px] font-semibold uppercase tracking-wide hover:opacity-70 transition-opacity"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};

export default SyncStatusBanner;
