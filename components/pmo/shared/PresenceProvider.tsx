"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useBoardPresence, BoardPresenceState } from "@/lib/pmo/hooks/useBoardPresence";

const PresenceContext = createContext<BoardPresenceState | null>(null);

interface PresenceProviderProps {
  boardId: string | null;
  tenantId: string | null;
  currentUser: {
    userId: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  children: ReactNode;
}

export function PresenceProvider({ boardId, tenantId, currentUser, children }: PresenceProviderProps) {
  const presence = useBoardPresence({
    boardId,
    tenantId,
    currentUser,
    enabled: !!boardId && !!tenantId && !!currentUser,
  });

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}
