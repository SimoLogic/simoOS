"use client";

import React, { useEffect, useState } from "react";
import { getPanelsAction, updatePanelAction, type PmoPanel, type PanelWidget } from "@/app/actions/pmo/panel-actions";
import { getBoardsAction } from "@/app/actions/pmo/board-actions";
import { DashboardEngine } from "./DashboardEngine";
import { useSessionStore } from "@/lib/session-store";
import { Settings, Plus, LayoutGrid, Loader2 } from "lucide-react";

export function GlobalDashboardView({ panelId }: { panelId: string }) {
  const { tenant_id } = useSessionStore();
  const [panel, setPanel] = useState<PmoPanel | null>(null);
  const [allBoards, setAllBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Widget config modal
  const [editingWidget, setEditingWidget] = useState<number | null>(null);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!tenant_id) return;
      setLoading(true);
      const panelsRes = await getPanelsAction(tenant_id, "user-fallback"); // Real ownerId ignored for global views or fetched from session later
      if (panelsRes.success) {
        const p = panelsRes.data?.find(p => p.id === panelId);
        if (p) {
          // Verify structure of widgets array
          if (!p.config || !Array.isArray(p.config.widgets)) {
             p.config = { widgets: [] };
          }
          setPanel(p);
        }
      }
      
      const boards = await getBoardsAction(tenant_id);
      setAllBoards(boards);
      setLoading(false);
    }
    load();
  }, [panelId, tenant_id]);

  const handleAddWidget = async () => {
    if (!panel || !tenant_id) return;
    const newWidget: PanelWidget = {
      id: "widget_" + Date.now(),
      type: "activity", // currently routing to existing project health inside DashboardEngine
      sourceBoardIds: [],
      x: 0, y: 0, w: 12, h: 4
    };
    const newConfig = { widgets: [...panel.config.widgets, newWidget] };
    setPanel({ ...panel, config: newConfig });
    await updatePanelAction(panel.id, tenant_id, { config: newConfig });
  };

  const handleSaveWidget = async (idx: number) => {
    if (!panel || !tenant_id) return;
    setIsSaving(true);
    const newWidgets = [...panel.config.widgets];
    newWidgets[idx].sourceBoardIds = selectedBoards;
    const newConfig = { widgets: newWidgets };
    const res = await updatePanelAction(panel.id, tenant_id, { config: newConfig });
    if (res.success) setPanel({ ...panel, config: newConfig });
    setIsSaving(false);
    setEditingWidget(null);
  };

  if (loading) {
     return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (!panel) return <div className="p-8">Panel not found.</div>;

  return (
    <div className="w-full h-full flex flex-col bg-[#F7F8FA] overflow-y-auto absolute inset-0">
      <div className="flex items-center justify-between px-8 py-6 border-b border-white bg-slate-50/50 relative backdrop-blur-sm z-10 shrink-0">
        <div>
           <div className="flex items-center gap-3">
              <span className="text-2xl">{panel.icon}</span>
              <h1 className="text-2xl font-bold tracking-tight text-[#323338]">{panel.name}</h1>
           </div>
           <p className="text-sm text-[#676879] mt-1 ml-9">Global Aggregation Panel (Cross-Board Engine)</p>
        </div>
        <button onClick={handleAddWidget} className="bg-[#6161FF] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition">
           <Plus className="w-4 h-4" /> Add Widget
        </button>
      </div>

      <div className="p-8 flex flex-col gap-8 flex-1">
        {panel.config.widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
             <LayoutGrid className="w-12 h-12 text-slate-300 mb-4" />
             <h3 className="text-lg font-bold text-slate-700">No widgets yet</h3>
             <p className="text-sm text-slate-500 mb-6">Add a widget and bind it to multiple boards to see aggregated data.</p>
             <button onClick={handleAddWidget} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50">
               + Create First Widget
             </button>
          </div>
        ) : (
          panel.config.widgets.map((widget: PanelWidget, idx: number) => (
             <div key={widget.id} className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/80">
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <LayoutGrid className="w-4 h-4 text-[#6161FF]" />
                      Project Health Aggregator
                   </div>
                   <button onClick={() => { setEditingWidget(idx); setSelectedBoards(widget.sourceBoardIds || []); }} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition">
                      <Settings className="w-4 h-4" />
                   </button>
                </div>
                
                <div className="flex-1 relative">
                   {(!widget.sourceBoardIds || widget.sourceBoardIds.length === 0) ? (
                      <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                         <span className="text-sm font-medium text-slate-500">No data source connected</span>
                         <button onClick={() => { setEditingWidget(idx); setSelectedBoards([]); }} className="text-[#6161FF] text-xs font-bold uppercase tracking-wider hover:underline">
                            Configure Source
                         </button>
                      </div>
                   ) : (
                      <DashboardEngine
                         orgId={tenant_id || ""}
                         boardIds={widget.sourceBoardIds} 
                         title={`Aggregated Health (${widget.sourceBoardIds.length} boards)`}
                         subtitle="Cross-Board Dynamic Render"
                      />
                   )}
                </div>

                {/* Settings Overlay using absolute positioning inside the widget container */}
                {editingWidget === idx && (
                   <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col p-8">
                       <h3 className="text-lg font-bold text-slate-800 mb-6">Configure Widget Data Sources</h3>
                       <div className="flex-1 overflow-y-auto">
                          <label className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-3 block">Target Boards</label>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                             {allBoards.map(b => (
                                <label key={b.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-[#6161FF] cursor-pointer transition">
                                   <input 
                                      type="checkbox" 
                                      checked={selectedBoards.includes(b.id)}
                                      onChange={(e) => {
                                         if(e.target.checked) setSelectedBoards([...selectedBoards, b.id]);
                                         else setSelectedBoards(selectedBoards.filter(id => id !== b.id));
                                      }}
                                      className="mt-1"
                                   />
                                   <div className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-700">{b.title}</span>
                                   </div>
                                </label>
                             ))}
                          </div>
                          {allBoards.length === 0 && <span className="text-sm text-slate-500 italic">No boards available in this workspace.</span>}
                       </div>
                       <div className="flex items-center gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                          <button onClick={() => setEditingWidget(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                          <button onClick={() => handleSaveWidget(idx)} disabled={isSaving} className="px-6 py-2 text-sm font-bold text-white bg-[#6161FF] hover:bg-blue-700 rounded-xl flex items-center gap-2">
                             {isSaving ? "Saving..." : "Save Configuration"}
                          </button>
                       </div>
                   </div>
                )}
             </div>
          ))
        )}
      </div>
    </div>
  );
}
