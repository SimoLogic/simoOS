// ⚠️ LEER ARCHITECTURE.md §6 (AUTH) antes de modificar
// useBoardPresence.ts — Presencia de usuarios en un board PMO en tiempo real
//
// Usa Supabase Realtime Presence (NOT Postgres Changes) para rastrear:
//   - Qué usuarios están viendo el mismo board actualmente
//   - Avatars, nombres, cursores (Sprint 4)
//
// Vibe UX: mostrar avatares de presencia en el top-right del board header
// (igual que Monday.com — circulitos apilados de usuarios conectados)

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface BoardPresenceUser {
  userId:    string;
  name:      string;
  avatarUrl: string | null;
  initials:  string;
  color:     string;      // Color único por usuario (para el avatar ring)
  activeCellId?: string | null; // ID of the cell the user is currently editing/hovering
  joinedAt:  string;      // ISO — para ordenar por quién llegó primero
}

export interface UseBoardPresenceOptions {
  boardId:   string | null;
  tenantId:     string | null;
  /** Usuario local (yo) */
  currentUser: {
    userId:    string;
    name:      string;
    avatarUrl?: string | null;
  } | null;
  enabled?: boolean;
}

export interface BoardPresenceState {
  /** Todos los usuarios en el board (incluyendo el usuario actual) */
  presentUsers:   BoardPresenceUser[];
  /** Número de usuarios presentes */
  count:          number;
  /** Si el canal de presencia está conectado */
  isConnected:    boolean;
  /** Función para actualizar mi posición/cursor */
  updateCursor:   (cellId: string | null) => void;
}

// ─── PALETA DE COLORES para rings de avatares ─────────────────────────────────
// Usando la paleta Vibe para consistencia visual
const PRESENCE_COLORS = [
  "#6161FF",  // vibe-purple
  "#00CA72",  // vibe-green
  "#FDAB3D",  // vibe-orange
  "#0086C0",  // vibe-blue
  "#FF3D57",  // vibe-pink
  "#181B34",  // vibe-mirage
  "#002B5B",  // navy-blue
  "#0047AB",  // cobalt-blue
];

function assignColor(userId: string): string {
  // Hash determinístico del userId para asignar siempre el mismo color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ─── SINGLETON BROWSER CLIENT ─────────────────────────────────────────────────
let _presenceClient: ReturnType<typeof createClient> | null = null;

function getPresenceClient() {
  if (_presenceClient) return _presenceClient;
  _presenceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _presenceClient;
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * useBoardPresence — Rastrea y publica presencia de usuarios en un board PMO
 * 
 * Uso en BoardHeader:
 * ```tsx
 * const { presentUsers, count } = useBoardPresence({
 *   boardId,
 *   tenantId,
 *   currentUser: { userId: session.userId, name: session.name },
 * });
 * 
 * // Renderizar avatares apilados
 * return presentUsers.slice(0, 5).map(u => <Avatar key={u.userId} user={u} />);
 * ```
 */
export function useBoardPresence({
  boardId,
  tenantId,
  currentUser,
  enabled = true,
}: UseBoardPresenceOptions): BoardPresenceState {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presentUsers, setPresentUsers] = useState<BoardPresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !boardId || !tenantId || !currentUser?.userId) return;

    const supabase     = getPresenceClient();
    const channelName  = `pmo:presence:${tenantId}:${boardId}`;

    // Limpiar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.userId } },
    });

    // ── Manejar cambios de presencia ─────────────────────────────────────────
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{
        userId:    string;
        name:      string;
        avatarUrl: string | null;
        activeCellId?: string | null;
        joinedAt:  string;
      }>();

      const users: BoardPresenceUser[] = Object.values(state)
        .flat()
        .map((u) => ({
          userId:    u.userId,
          name:      u.name,
          avatarUrl: u.avatarUrl,
          initials:  getInitials(u.name),
          color:     assignColor(u.userId),
          activeCellId: u.activeCellId,
          joinedAt:  u.joinedAt,
        }))
        // Ordenar: yo primero, luego por tiempo de conexión
        .sort((a, b) => {
          if (a.userId === currentUser.userId) return -1;
          if (b.userId === currentUser.userId) return 1;
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        });

      setPresentUsers(users);
    });

    // ── Subscribir y publicar presencia propia ───────────────────────────────
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);

        await channel.track({
          userId:    currentUser.userId,
          name:      currentUser.name,
          avatarUrl: currentUser.avatarUrl ?? null,
          joinedAt:  new Date().toISOString(),
          activeCellId: null,
        });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        if (process.env.NODE_ENV === "development") {
          console.warn(`[PMO Presence] Channel "${channelName}" error:`, status);
        }
      }
    });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setPresentUsers([]);
    };
  }, [boardId, tenantId, currentUser?.userId, currentUser?.name, enabled]);

  return {
    presentUsers,
    count: presentUsers.length,
    isConnected,
    updateCursor: (cellId: string | null) => {
      if (channelRef.current) {
        channelRef.current.track({
          userId:    currentUser!.userId,
          name:      currentUser!.name,
          avatarUrl: currentUser!.avatarUrl ?? null,
          joinedAt:  new Date().toISOString(),
          activeCellId: cellId,
        });
      }
    }
  };
}
