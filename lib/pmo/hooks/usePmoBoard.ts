// ⚠️ Lee ARCHITECTURE.md antes de modificar
// usePmoBoard — Hook para cargar datos de un Board PMO desde la DB
//
// PROTOCOLO DE INTEGRACIÓN (State vs DB):
// 1. Lee tenant_id desde Zustand (Global State)  
// 2. Inyecta tenant_id a la Server Action
// 3. Server Action consulta PostgreSQL con filtro orgId
// 4. Devuelve datos al componente
//
// Sprint 2: Implementar con React Query + Server Actions reales
// Sprint 1: Stub con tipos correctos para scaffolding

"use client";

import { useState, useEffect } from "react";
import type { PmoBoard, BoardView } from "@/types/pmo.types";

interface UsePmoBoardResult {
  board: PmoBoard | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * usePmoBoard — Carga un board PMO desde la base de datos
 * 
 * @param boardId - ID del board a cargar
 * @param orgId   - Tenant ID (obtenido de usePmoStore, no hardcodeado)
 * 
 * SPRINT 2: Implementar fetchBoard() con Server Action real
 */
export function usePmoBoard(
  boardId: string | null,
  orgId: string | null
): UsePmoBoardResult {
  const [board, setBoard] = useState<PmoBoard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!boardId || !orgId) return;

    setIsLoading(true);
    setError(null);

    // TODO Sprint 2: Reemplazar con Server Action real
    // import { fetchPmoBoard } from "@/app/actions/pmo/board-actions";
    // const result = await fetchPmoBoard({ boardId, orgId });
    
    // Sprint 1 stub — simula latencia de red
    const timeout = setTimeout(() => {
      setBoard({
        id: boardId,
        orgId,
        workspaceId: "ws-demo",
        title: "My Playbook — Q2 2025",
        isPlaybookBoard: false,
        activeView: "grid" as BoardView,
        isViewLocked: false,
        isArchived: false,
        groups: [],
        columns: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [boardId, orgId, refreshToken]);

  return {
    board,
    isLoading,
    error,
    refetch: () => setRefreshToken((t) => t + 1),
  };
}
