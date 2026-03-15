"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, X, Loader2, Sparkles } from "lucide-react";
import { getProjectSummaryAction } from "@/app/actions/pmo/ai-actions";

interface AiSummaryModalProps {
  orgId: string;
  boardId: string;
  onClose: () => void;
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({ orgId, boardId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function generate() {
      setLoading(true);
      const res = await getProjectSummaryAction(orgId, boardId);
      if (res.success) {
        setSummary(res.summary || "No se pudo generar el resumen.");
      } else {
        setError(res.error || "Ocurrió un error con la IA.");
      }
      setLoading(false);
    }
    generate();
  }, [orgId, boardId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#001e42]/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-vibe-blue to-[#6161FF] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            <h2 className="font-bold text-sm uppercase tracking-widest">Resumen Inteligente PMO</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 min-h-[300px] max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
               <Loader2 className="w-10 h-10 text-vibe-blue animate-spin" />
               <div className="text-center">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Consultando a SIMO AI...</p>
                  <p className="text-[10px] text-gray-300 mt-1">Analizando logs de actividad y métricas de ejecución</p>
               </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
               Error: {error}
            </div>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none">
               <div className="flex items-center gap-2 mb-4 text-vibe-blue opacity-50">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Resultado de Análisis Ejecutivo</span>
               </div>
               
               {/* Simple Markdown-ish display (v1) */}
               <div className="whitespace-pre-wrap text-[#323338] leading-relaxed">
                  {summary}
               </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <p className="text-[10px] text-gray-400 italic">IA generativa puede cometer errores. Verifica hitos críticos.</p>
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-200 rounded text-xs font-bold text-vibe-dark hover:bg-gray-100 transition-colors"
            >
                Entendido
            </button>
        </div>
      </motion.div>
    </div>
  );
};
