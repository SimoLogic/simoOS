"use client";

import React, { useState } from "react";
import { X, Palette, CheckCircle2, Loader2 } from "lucide-react";
import { updateWorkspaceThemeAction } from "@/app/actions/pmo/workspace-actions";

interface WorkspaceSettingsModalProps {
  orgId: string;
  workspaceId: string;
  currentThemeColor?: string;
  onClose: () => void;
  onThemeUpdated: (newColor: string) => void;
}

const VIBE_TOKENS = [
  { id: "vibe-blue", label: "Vibe Blue (Default)", hex: "#6161FF" },
  { id: "vibe-cobalt", label: "Cobalt Night", hex: "#002B5B" },
  { id: "vibe-emerald", label: "Emerald Success", hex: "#10B981" },
  { id: "vibe-rose", label: "Action Red", hex: "#E11D48" },
  { id: "vibe-amber", label: "Warning Amber", hex: "#F59E0B" },
  { id: "vibe-purple", label: "Royal Purple", hex: "#8B5CF6" },
];

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  orgId,
  workspaceId,
  currentThemeColor = "#6161FF",
  onClose,
  onThemeUpdated
}) => {
  const [selectedHex, setSelectedHex] = useState(currentThemeColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const res = await updateWorkspaceThemeAction(orgId, workspaceId, selectedHex);
    
    if (res.success) {
      onThemeUpdated(selectedHex); // Tells parent to inject CSS variable --vibe-blue
      onClose();
    } else {
      setError(res.error || "Failed to update theme.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001e42]/40 backdrop-blur-sm shadow-2xl p-4">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-250"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-vibe-blue/10 flex items-center justify-center">
               <Palette className="w-4 h-4 text-vibe-blue" />
            </div>
            <h2 className="text-lg font-bold text-vibe-dark">Personalizar Workspace</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 flex flex-col gap-6">
          <p className="text-sm text-gray-500 font-medium">
             Selecciona un Vibe Token para establecer el color primario de todo este Workspace. Esta acción actualizará los botones, enlaces y barras de gráficos.
          </p>

          <div className="grid grid-cols-2 gap-3">
              {VIBE_TOKENS.map(token => {
                 const isSelected = selectedHex === token.hex;
                 return (
                    <button
                       key={token.id}
                       onClick={() => setSelectedHex(token.hex)}
                       className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-100 
                          ${isSelected ? 'border-vibe-blue bg-[#6161FF]/5' : 'border-gray-100 hover:border-gray-200'}
                       `}
                    >
                       <div className="flex items-center gap-3">
                          <div 
                             className="w-5 h-5 rounded-full shadow-inner" 
                             style={{ backgroundColor: token.hex }} 
                          />
                          <span className={`text-sm font-semibold ${isSelected ? 'text-vibe-dark' : 'text-gray-500'}`}>
                             {token.label}
                          </span>
                       </div>
                       {isSelected && <CheckCircle2 className="w-4 h-4 text-vibe-blue" />}
                    </button>
                 );
              })}
          </div>

          {error && (
             <p className="text-sm font-semibold text-vibe-red bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          )}

          <div className="w-full h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 mt-2">
             <div 
               className="px-6 py-1.5 rounded-full text-white text-xs font-bold shadow-md transition-colors"
               style={{ backgroundColor: selectedHex }}
             >
                Preview Botón Primario
             </div>
          </div>
        </div>

        <footer className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
           >
             Cancelar
           </button>
           <button 
             disabled={loading}
             onClick={handleSave}
             className="flex items-center justify-center px-6 py-2 bg-vibe-blue hover:brightness-110 active:brightness-90 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar Vibe Token'}
           </button>
        </footer>
      </div>
    </div>
  );
}
