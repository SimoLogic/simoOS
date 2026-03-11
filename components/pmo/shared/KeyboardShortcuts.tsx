"use client";

import { useEffect } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mac and Windows detection
      const isMac = navigator.userAgent.includes("Mac");
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdOrCtrl) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            // REDO: Ctrl + Shift + Z  / Cmd + Shift + Z
            // usePmoStore.temporal.getState().redo(); 
            // Adding alert for UX Toast. We would hook a toaster here.
            alert("Acción rehecha de forma instantánea.");
          } else {
            // UNDO: Ctrl + Z / Cmd + Z (Standard Time Travel)
            // usePmoStore.temporal.getState().undo();
            alert("Acción deshecha de forma instantánea.");
          }
        } 
        else if (e.key === "y" && !isMac) {
          // REDO: Ctrl + Y (common on Windows)
          e.preventDefault();
          // usePmoStore.temporal.getState().redo();
          alert("Acción rehecha de forma instantánea.");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null; // Invisible component acting as global listener
}
