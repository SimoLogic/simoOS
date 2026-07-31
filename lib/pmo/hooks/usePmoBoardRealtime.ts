// ⚠️ LEER ARCHITECTURE.md §9 (SIMO IS INTEGRATION) y §6 (AUTH) antes de modificar
// usePmoBoardRealtime.ts — Suscripción a cambios de board en tiempo real
//
// Usa Supabase Realtime (Postgres Changes) para recibir:
//   - INSERT/UPDATE/DELETE en pmo_tasks del board activo
//   - INSERT/UPDATE/DELETE en pmo_groups del board activo
//
// PROTOCOLO DE INTEGRACIÓN:
//   1. Lee boardId + tenantId desde props (vendrán del componente que lo usa)
//   2. Filtra por boardId y tenantId en el channel (multi-tenant safe)
//   3. Llama onTaskChange/onGroupChange con el evento recibido
//
// Sprint 4: Conectar los eventos a la mutación del estado local (invalidate queries)

"use client";

import { useEffect, useRef } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// ─── TIPOS DE EVENTOS ─────────────────────────────────────────────────────────

export type RealtimeTaskEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new:       Record<string, unknown> | null;
  old:       Record<string, unknown> | null;
};

export type RealtimeGroupEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new:       Record<string, unknown> | null;
  old:       Record<string, unknown> | null;
};

export interface UsePmoBoardRealtimeOptions {
  boardId:        string | null;
  tenantId:          string | null;
  onTaskChange?:  (event: RealtimeTaskEvent) => void;
  onGroupChange?: (event: RealtimeGroupEvent) => void;
  enabled?:       boolean;
}

// ─── SINGLETON SUPABASE CLIENT (browser-side) ─────────────────────────────────
let _browserClient: ReturnType<typeof createClient> | null = null;

function getBrowserClient() {
  if (_browserClient) return _browserClient;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  _browserClient = createClient(url, key);
  return _browserClient;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * usePmoBoardRealtime — Escucha cambios en tiempo real de un board PMO
 * 
 * Uso en el componente de board:
 * ```ts
 * usePmoBoardRealtime({
 *   boardId,
 *   tenantId,
 *   onTaskChange: (event) => {
 *     if (event.eventType === "UPDATE") refetchTasks();
 *   },
 * });
 * ```
 * 
 * Sprint 4: Reemplazar refetch con mutación optimista del cache de React Query.
 */
export function usePmoBoardRealtime({
  boardId,
  tenantId,
  onTaskChange,
  onGroupChange,
  enabled = true,
}: UsePmoBoardRealtimeOptions): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !boardId || !tenantId) return;

    const supabase = getBrowserClient();
    const channelName = `pmo:board:${boardId}`;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName)

      // ── Cambios en tareas del board ──────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event:  "*",   // INSERT | UPDATE | DELETE
          schema: "public",
          table:  "pmo_tasks",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (!onTaskChange) return;
          // Verificar tenant_id en el payload (seguridad multi-tenant adicional)
          const newRow = payload.new as Record<string, unknown> | null;
          const oldRow = payload.old as Record<string, unknown> | null;
          const rowOrgId = (newRow?.tenant_id ?? oldRow?.tenant_id) as string | undefined;
          if (rowOrgId && rowOrgId !== tenantId) return; // Ignorar si no coincide org

          onTaskChange({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new:       payload.new as Record<string, unknown> | null,
            old:       payload.old as Record<string, unknown> | null,
          });
        }
      )

      // ── Cambios en grupos del board ──────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "pmo_groups",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (!onGroupChange) return;
          onGroupChange({
            eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            new:       payload.new as Record<string, unknown> | null,
            old:       payload.old as Record<string, unknown> | null,
          });
        }
      )

      .subscribe((status) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[PMO Realtime] Channel "${channelName}":`, status);
        }
      });

    channelRef.current = channel;

    // Cleanup al desmontar o cambiar boardId
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [boardId, tenantId, enabled, onTaskChange, onGroupChange]);
}
