"use client";

import React from "react";
import { usePresence } from "./PresenceProvider";
import { cn } from "@/lib/utils";

export function BoardPresenceStack() {
  const { presentUsers, count } = usePresence();

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
      <div className="flex -space-x-2 overflow-hidden">
        {presentUsers.slice(0, 5).map((user) => (
          <div
            key={user.userId}
            className="inline-block h-6 w-6 rounded-full ring-2 ring-white overflow-hidden bg-gray-100"
            title={user.name}
            style={{ backgroundColor: user.color + "20" }} // Faded background
          >
            {user.avatarUrl ? (
              <img
                className="h-full w-full object-cover"
                src={user.avatarUrl}
                alt={user.name}
              />
            ) : (
              <div 
                className="flex h-full w-full items-center justify-center text-[10px] font-bold"
                style={{ color: user.color }}
              >
                {user.initials}
              </div>
            )}
          </div>
        ))}
      </div>
      {count > 5 && (
        <span className="text-xs font-medium text-gray-500">
          +{count - 5}
        </span>
      )}
      <div className="flex items-center gap-1.5 ml-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">En vivo</span>
      </div>
    </div>
  );
}
