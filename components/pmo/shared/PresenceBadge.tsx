"use client";

import React from "react";
import { BoardPresenceUser } from "@/lib/pmo/hooks/useBoardPresence";
import { cn } from "@/lib/utils";

interface PresenceBadgeProps {
  users: BoardPresenceUser[];
  className?: string;
  size?: "xs" | "sm";
}

export function PresenceBadge({ users, className, size = "xs" }: PresenceBadgeProps) {
  if (users.length === 0) return null;

  const dotSize = size === "xs" ? "w-4 h-4 text-[7px]" : "w-6 h-6 text-[10px]";

  return (
    <div className={cn("flex -space-x-1 items-center", className)}>
      {users.slice(0, 3).map((u) => (
        <div
          key={u.userId}
          className={cn(
            "rounded-full border border-white flex items-center justify-center font-bold text-white shadow-sm transition-all",
            dotSize
          )}
          style={{ backgroundColor: u.color }}
          title={u.name}
        >
          {u.avatarUrl ? (
            <img 
              src={u.avatarUrl} 
              alt={u.initials} 
              className="w-full h-full rounded-full object-cover" 
            />
          ) : (
            u.initials
          )}
        </div>
      ))}
      {users.length > 3 && (
        <div className={cn(
          "rounded-full border border-white bg-gray-400 flex items-center justify-center font-bold text-white shadow-sm",
          dotSize
        )}>
          +{users.length - 3}
        </div>
      )}
    </div>
  );
}
