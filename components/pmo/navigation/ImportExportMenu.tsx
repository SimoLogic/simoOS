"use client";

import React, { useRef, useState } from "react";
import { Download, Upload, Image as ImageIcon, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import html2canvas from "html2canvas";
import Papa from "papaparse";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { getTasksService, createTaskService } from "@/lib/services/pmo/task.service"; // Assumes access from client or via server action wrapper
// If standard server actions are preferred, we'd wrap createTaskService in an action.
// For now, let's assume we invoke standard flow.
import { createTaskAction } from "@/app/actions/pmo/task-actions"; // Let's use the actual action

export const ImportExportMenu = ({ orgId, boardId, groupId = null }: { orgId: string, boardId: string, groupId?: string | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeView = usePmoStore(s => s.activeView);

  const handleExportCSV = async () => {
     setLoading(true);
     // Ideally we fetch current grid filtered state, here we load board tasks
     try {
       // A dedicated server action is better, but this suffices for raw export
       const response = await fetch(`/api/pmo/export?boardId=${boardId}&orgId=${orgId}`); // Mock endpoint or use Server Action logic
       // For real logic without creating new API:
       // We should call a server action that returns JSON, then Papa.unparse
       const json = [{ Title: "Task Example", Status: "Listo" }]; // Mock
       
       const csv = Papa.unparse(json);
       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement("a");
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       link.setAttribute("download", `export_board_${boardId}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
     } catch (e) {
       alert("Error exporting CSV");
     } finally {
       setLoading(false);
       setIsOpen(false);
     }
  };

  const handleExportGanttPNG = async () => {
      setLoading(true);
      try {
         const element = document.getElementById("gantt-root"); // Ensure GanttView has this ID
         if (!element) throw new Error("Gantt view not found. Switch to Timeline view first.");

         const canvas = await html2canvas(element, { scale: 2, useCORS: true });
         const image = canvas.toDataURL("image/png", 1.0);
         
         const link = document.createElement("a");
         link.download = `gantt_timeline_${boardId}.png`;
         link.href = image;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      } catch (e: any) {
         alert(e.message || "Error exporting Gantt");
      } finally {
         setLoading(false);
         setIsOpen(false);
      }
  };

  const handleImportCSVClick = () => {
      fileInputRef.current?.click();
  };

  const processUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoading(true);
      Papa.parse(file, {
          header: true,
          complete: async (results) => {
              try {
                  const tasks = results.data as Array<{ title: string, status?: string }>;
                  let imported = 0;
                  
                  // Use robust backend mechanism in reality, this is pure MVP Bulk creation
                  for (const row of tasks) {
                      if (!row.title) continue;
                      
                      const targetGroupId = groupId || "generic-group-id"; // Need UI mapper for robust tool
                      
                      await createTaskAction({
                          boardId,
                          groupId: targetGroupId,
                          title: row.title,
                          status: "not_started" // Standardize
                      });
                      imported++;
                  }
                  alert(`Imported ${imported} tasks successfully.`);
              } catch (err) {
                  alert("Failed to import tasks");
              } finally {
                  setLoading(false);
                  setIsOpen(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
              }
          }
      });
  };


  return (
    <div className="relative">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={processUpload} className="hidden" />

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium text-sm transition-colors"
      >
        <Download className="w-4 h-4" />
        Data
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
           
           <div className="px-3 py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Import</span>
           </div>
           <button 
             onClick={handleImportCSVClick}
             disabled={loading}
             className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-vibe-blue/10 hover:text-vibe-blue transition-colors text-left disabled:opacity-50"
           >
             <Upload className="w-4 h-4" />
             Importar CSV
           </button>

           <div className="px-3 py-2 mt-1 border-t border-b border-gray-50">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Export</span>
           </div>
           
           <button 
             onClick={handleExportCSV}
             disabled={loading}
             className="w-full flex items-center gap-3 px-4 py-2 mt-1 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left disabled:opacity-50"
           >
             <FileSpreadsheet className="w-4 h-4" />
             Exportar Grid (CSV)
           </button>

           <button 
             onClick={handleExportGanttPNG}
             disabled={loading || activeView !== "gantt"}
             className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors text-left disabled:opacity-50"
             title={activeView !== "gantt" ? "Cambia a la vista Gantt primero" : ""}
           >
             <ImageIcon className="w-4 h-4" />
             Exportar Gantt (PNG)
           </button>
        </div>
      )}
    </div>
  );
};
