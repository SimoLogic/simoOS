// ⚠️ Lee ARCHITECTURE.md antes de modificar
// usePmoTasks — Hook para cargar tareas de un grupo de un Board PMO
//
// PROTOCOLO: Lee tenantId de Zustand → Server Action → PostgreSQL
// Sprint 2: Implementar paginación + virtualización para >3,000 items

"use client";

import { useState, useEffect } from "react";
import type { PmoTask, PmoGroup } from "@/types/pmo.types";

interface UsePmoTasksResult {
  groups: PmoGroup[];
  totalCount: number;
  isLoading: boolean;
  isHPCMode: boolean;  // true si >3000 items
  error: string | null;
  refetch: () => void;
}

const HPC_THRESHOLD = 3000;

/**
 * usePmoTasks — Carga grupos y tareas de un board PMO
 * 
 * Sprint 2: Implementar con React Query + Server Actions sobre PostgreSQL
 * Sprint 4: Activar HPCRenderMode + @tanstack/react-virtual si totalCount > 3000
 */
export function usePmoTasks(
  boardId: string | null,
  tenantId: string | null
): UsePmoTasksResult {
  const [groups, setGroups] = useState<PmoGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const isHPCMode = totalCount > HPC_THRESHOLD;

  useEffect(() => {
    if (!boardId || !tenantId) return;

    setIsLoading(true);
    setError(null);

    // TODO Sprint 2: Reemplazar con Server Action
    // import { fetchPmoGroups } from "@/app/actions/pmo/task-actions";
    // const result = await fetchPmoGroups({ boardId, tenantId });
    
    // Sprint 1 stub
    const timeout = setTimeout(() => {
      setGroups([]);
      setTotalCount(0);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [boardId, tenantId, refreshToken]);

  return {
    groups,
    totalCount,
    isLoading,
    isHPCMode,
    error,
    refetch: () => setRefreshToken((t) => t + 1),
  };
}

/** Tipo de retorno sin tareas — para uso en Kanban (agrupa por status) */
export type { PmoTask, PmoGroup };
