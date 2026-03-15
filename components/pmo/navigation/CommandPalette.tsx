"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchTasksAction } from "@/app/actions/pmo/task-actions";
import { PmoTask } from "@/types/pmo.types";
import { usePmoStore } from "@/lib/stores/pmo.store";

export function CommandPalette({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<PmoTask[]>([]);
  
  const openSidePeek = usePmoStore(s => s.openSidePeek);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setTasks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchTasksAction(query);
        setTasks(results);
      } catch (error) {
        console.error("Failed to search tasks", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, orgId]);

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          label="Global Command Menu"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] antialiased bg-black/40 backdrop-blur-sm"
        >
            <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} // expressive-short 250ms
            className="w-full max-w-2xl bg-white rounded-[16px] shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
              <Command.Input 
                value={query}
                onValueChange={setQuery}
                placeholder="Busca tareas, integra con Simo o ejecuta acciones..." 
                className="w-full bg-transparent border-0 h-14 text-sm outline-none placeholder:text-gray-400 text-vibe-dark"
                autoFocus
              />
              {loading && <Loader2 className="w-4 h-4 text-vibe-blue animate-spin ml-2 shrink-0" />}
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="p-4 text-sm text-center text-gray-500">
                {query ? "No se encontraron resultados." : "Escribe algo para buscar."}
              </Command.Empty>

              <Command.Group heading="Simo IS" className="px-2 py-1 text-xs font-semibold text-vibe-purple uppercase tracking-wider">
                <Command.Item 
                  onSelect={() => alert("Forcing Playbook Sync...")}
                  className="px-3 py-2 text-sm text-gray-700 rounded-md cursor-pointer data-[selected=true]:bg-vibe-purple/10 data-[selected=true]:text-vibe-purple transition-colors flex items-center gap-2"
                >
                  <div className="w-4 h-4 rounded bg-vibe-purple text-white flex items-center justify-center text-[8px] font-bold">SI</div>
                  Sincronizar Playbook Ahora
                </Command.Item>
                <Command.Item 
                  onSelect={() => alert("Viewing Integration Status...")}
                  className="px-3 py-2 text-sm text-gray-700 rounded-md cursor-pointer data-[selected=true]:bg-vibe-purple/10 data-[selected=true]:text-vibe-purple transition-colors"
                >
                  Estado de Integración
                </Command.Item>
              </Command.Group>

              {tasks.length > 0 && (
                <Command.Group heading="Tareas" className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">
                  {tasks.map((task) => {
                     const matchInDesc = task.description && task.description.toLowerCase().includes(query.toLowerCase());
                     
                     return (
                        <Command.Item
                          key={task.id}
                          onSelect={() => {
                            openSidePeek(task.id);
                            setOpen(false);
                          }}
                          className="flex items-center px-3 py-2 text-sm text-gray-700 bg-transparent rounded-md cursor-pointer data-[selected=true]:bg-vibe-blue/10 data-[selected=true]:text-vibe-dark transition-colors"
                        >
                          <div className="flex flex-col flex-1 truncate text-left">
                            <span className="font-medium truncate underline-none">{task.title}</span>
                            {matchInDesc && (
                                <span className="text-[10px] text-gray-400 mt-0.5 max-w-full truncate">... {task.description}</span>
                            )}
                          </div>
                          {matchInDesc && (
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-widest">En Descripción</span>
                          )}
                        </Command.Item>
                      );
                  })}
                </Command.Group>
              )}

              <Command.Group heading="Acciones" className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2 border-t border-gray-50 pt-2">
                <Command.Item 
                  onSelect={() => alert("Creating task...")}
                  className="px-3 py-2 text-sm text-gray-700 rounded-md cursor-pointer data-[selected=true]:bg-gray-100 transition-colors"
                >
                  ✨ Nueva Tarea
                </Command.Item>
                <Command.Item 
                  onSelect={() => alert("Navigating to My Tasks...")}
                  className="px-3 py-2 text-sm text-gray-700 rounded-md cursor-pointer data-[selected=true]:bg-gray-100 transition-colors"
                >
                  👤 Mis Tareas
                </Command.Item>
              </Command.Group>

            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
}
