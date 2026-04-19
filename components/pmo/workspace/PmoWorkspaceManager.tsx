"use client";

import React, { useState, useEffect } from "react";
import { FolderOpen, Plus, MoreHorizontal, LayoutGrid, Settings, Star } from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { getWorkspacesAction, createWorkspaceAction } from "@/app/actions/pmo-workspace-actions";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import GridView from "../views/GridView";

export const PmoWorkspaceManager: React.FC = () => {
    const { tenant_id, user_ide } = useSessionStore();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (tenant_id && user_ide) {
            getWorkspacesAction(tenant_id, user_ide).then((data) => {
                setWorkspaces(data);
                setLoading(false);
            });
        }
    }, [tenant_id, user_ide]);

    const handleCreateWorkspace = async () => {
        if (!tenant_id || !user_ide) return;
        const name = prompt("Nombre del nuevo Workspace:");
        if (!name) return;
        
        await createWorkspaceAction(name, "🗂️", "#6161FF", tenant_id, user_ide);
        const data = await getWorkspacesAction(tenant_id, user_ide);
        setWorkspaces(data);
    };

    if (selectedBoardId) {
        return (
            <div className="w-full h-full flex flex-col relative">
                {/* Embedded GridView or robust Board routing here in S-10 */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 bg-white">
                    <button 
                        onClick={() => setSelectedBoardId(null)}
                        className="text-sm font-medium text-slate-500 hover:text-[#6161FF]"
                    >
                        &larr; Volver a Workspaces
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-sm font-bold text-navy-blue">Tablero {selectedBoardId}</span>
                </div>
                <div className="flex-1 relative">
                    <GridView boardId={selectedBoardId} orgId={tenant_id || ""} isReadOnly={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mis Proyectos</h1>
                        <p className="text-slate-500 mt-1">Organiza tus tableros en Workspaces libres de restricciones.</p>
                    </div>
                    <button 
                        onClick={handleCreateWorkspace}
                        className="bg-[#6161FF] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Workspace
                    </button>
                </div>

                {loading ? (
                    <div className="h-40 flex items-center justify-center text-slate-400">Cargando workspaces...</div>
                ) : workspaces.length === 0 ? (
                    <div className="bg-white border text-center border-slate-200 rounded-xl p-12 shadow-sm">
                        <FolderOpen className="w-12 h-12 text-[#6161FF]/30 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-slate-800">Aún no tienes Workspaces</h2>
                        <p className="text-slate-500 mt-1 max-w-md mx-auto">
                            Los Workspaces te permiten agrupar múltiples tableros bajo un solo proyecto, departamento o iniciativa.
                        </p>
                        <button 
                            onClick={handleCreateWorkspace}
                            className="mt-6 font-medium text-[#6161FF] hover:underline"
                        >
                            Crear tu primer Workspace &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaces.map(ws => (
                            <div key={ws.id} className="bg-white border py-5 px-6 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ws.color}15`, color: ws.color }}>
                                            <span className="text-xl">{ws.icon || "🗂️"}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 group-hover:text-[#6161FF] transition-colors">{ws.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium">0 Tableros</p>
                                        </div>
                                    </div>
                                    <button 
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                        onClick={() => { setSelectedWorkspace(ws); setIsSettingsOpen(true); }}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#6161FF] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => alert("S-10: Nuevo Tablero")} className="hover:underline flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Añadir Tablero
                                    </button>
                                    <button className="hover:text-slate-800 flex items-center gap-1 text-slate-400">
                                        Explorar <LayoutGrid className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isSettingsOpen && selectedWorkspace && tenant_id && (
                <WorkspaceSettingsModal 
                    orgId={tenant_id}
                    workspaceId={selectedWorkspace.id}
                    currentThemeColor={selectedWorkspace.color}
                    onClose={() => { setIsSettingsOpen(false); setSelectedWorkspace(null); }}
                    onThemeUpdated={(color) => {
                        setWorkspaces(prev => prev.map(w => w.id === selectedWorkspace.id ? { ...w, color } : w));
                    }}
                />
            )}
        </div>
    );
};
