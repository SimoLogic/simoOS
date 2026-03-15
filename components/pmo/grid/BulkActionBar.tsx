"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown, Calendar, Trash2, X } from "lucide-react";
import { TaskStatus, TaskPriority } from "@/types/pmo.types";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdatePriority: (priority: TaskPriority) => void;
  onDelete: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onUpdatePriority, 
  onDelete 
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }} // Productive-Medium
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#181B34] text-white px-6 py-3 rounded-full shadow-2xl border border-white/10"
        >
          <div className="flex items-center gap-3 border-r border-white/10 pr-4 mr-2">
            <span className="bg-vibe-blue w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedCount}
            </span>
            <span className="text-sm font-medium">Items seleccionados</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Dropup - Logic Simplified for Demo */}
            <button 
                onClick={() => onUpdateStatus("done")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-vibe-green/20 hover:text-vibe-green transition-colors rounded-md border border-white/5"
            >
                <CheckCircle2 className="w-3.5 h-3.5" /> Listo
            </button>

            <button 
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-vibe-blue/20 hover:text-vibe-blue transition-colors rounded-md border border-white/5"
            >
                <ChevronDown className="w-3.5 h-3.5" /> Prioridad
            </button>

            <button 
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-vibe-orange/20 hover:text-vibe-orange transition-colors rounded-md border border-white/5"
            >
                <Calendar className="w-3.5 h-3.5" /> Fecha
            </button>

            <button 
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-vibe-pink/20 hover:text-vibe-pink transition-colors rounded-md border border-white/5"
            >
                <Trash2 className="w-3.5 h-3.5" /> Borrar
            </button>
          </div>

          <button 
            onClick={onClear}
            className="ml-4 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
