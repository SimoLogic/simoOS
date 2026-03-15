"use client";

import { useEffect } from "react";
import { usePmoStore } from "@/lib/stores/pmo.store";

export function UndoRedoListener() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                if (e.shiftKey) {
                    // Redo (Ctrl+Shift+Z)
                    (usePmoStore as any).temporal.getState().redo();
                } else {
                    // Undo (Ctrl+Z)
                    (usePmoStore as any).temporal.getState().undo();
                }
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
                // Redo (Ctrl+Y)
                (usePmoStore as any).temporal.getState().redo();
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return null;
}
