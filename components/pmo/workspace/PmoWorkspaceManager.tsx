"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FolderOpen, Plus, MoreHorizontal, LayoutGrid, Settings, Briefcase } from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { getWorkspacesAction, createWorkspaceAction } from "@/app/actions/pmo/board-actions";
import { getBoardsAction, getBoardAction } from "@/app/actions/pmo/board-actions";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import { TemplateSelectorModal } from "./TemplateSelectorModal";
import GridView from "../views/GridView";
import { CardsView } from "../views/CardsView";
import { BoardOnboarding } from "../shared/BoardOnboarding";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { GlobalDashboardView } from "../views/GlobalDashboardView";

export const PmoWorkspaceManager: React.FC = () => {
    const { tenant_id } = useSessionStore();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [boardsByWorkspace, setBoardsByWorkspace] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    
    // Binding the board selection to the global store so Sidebar can also control it
    const activeBoardId = usePmoStore(s => s.activeBoardId);
    const setActiveBoardId = usePmoStore(s => s.setActiveBoardId);
    const activePanelId = usePmoStore(s => s.activePanelId);
    const setActivePanelId = usePmoStore(s => s.setActivePanelId);

    const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Template creation modal state
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateWorkspaceId, setTemplateWorkspaceId] = useState<string | null>(null);

    const loadData = async () => {
        if (!tenant_id) return;
        try {
            const wsData = await getWorkspacesAction(tenant_id);
            setWorkspaces(wsData);
            
            const bData = await getBoardsAction(tenant_id);
            const map: Record<string, any[]> = {};
            bData.forEach(b => {
               if(b.workspaceId) {
                   if(!map[b.workspaceId]) map[b.workspaceId] = [];
                   map[b.workspaceId].push(b);
               }
            });
            setBoardsByWorkspace(map);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tenant_id]);

    const handleCreateWorkspace = async () => {
        if (!tenant_id) return;
        const name = prompt("New Workspace Name:");
        if (!name) return;
        
        await createWorkspaceAction({ tenantId: tenant_id, name });
        await loadData();
        window.dispatchEvent(new Event("pmo-workspaces-updated"));
    };

    const handleOpenTemplateModal = (wsId: string) => {
        setTemplateWorkspaceId(wsId);
        setTemplateModalOpen(true);
    };

    const handleTemplateCreated = async (newBoardId: string) => {
        await loadData();
        window.dispatchEvent(new Event("pmo-workspaces-updated"));
        setActiveBoardId(newBoardId);
    };

    const activeView = usePmoStore(s => s.activeView);

    if (activeBoardId) {
        const tenantId = tenant_id || "";

        const renderBoardView = () => {
            switch (activeView) {
                case "cards":
                    return <CardsView boardId={activeBoardId} tenantId={tenantId} isReadOnly={false} mode="my-projects" />;
                default:
                    return (
                        <>
                            <BoardOnboarding boardId={activeBoardId} />
                            <GridView boardId={activeBoardId} tenantId={tenantId} isReadOnly={false} />
                        </>
                    );
            }
        };

        return (
            <div className="w-full h-full flex flex-col relative motion-preset-slide-up-sm motion-duration-250">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 bg-white shadow-sm z-10 shrink-0">
                    <button 
                        onClick={() => setActiveBoardId(null)}
                        className="text-[13px] font-semibold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-md hover:text-[#6161FF] transition-colors"
                    >
                        ← Back to Workspaces
                    </button>
                </div>
                <div className="flex-1 relative bg-white">
                    {renderBoardView()}
                </div>
            </div>
        );
    }

    if (activePanelId) {
        return (
            <div className="w-full h-full flex flex-col relative motion-preset-slide-up-sm motion-duration-250">
                <GlobalDashboardView panelId={activePanelId} />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Projects</h1>
                        <p className="text-[14px] text-slate-500 mt-1">Organize your boards into departmental or initiative-based Workspaces.</p>
                    </div>
                    <button 
                        onClick={handleCreateWorkspace}
                        className="bg-[#6161FF] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all flex items-center gap-2 shadow hover:shadow-lg"
                    >
                        <Plus className="w-4 h-4" /> New Workspace
                    </button>
                </div>

                {loading ? (
                    <div className="h-40 flex items-center justify-center text-slate-400">Loading workspaces...</div>
                ) : workspaces.length === 0 ? (
                    /* S-09 Vibe Empty State */
                    <div className="bg-white border text-center border-slate-200 rounded-2xl p-16 shadow-sm flex flex-col items-center">
                        <div className="w-20 h-20 bg-[#6161FF]/10 rounded-full flex items-center justify-center mb-6">
                            <Briefcase className="w-10 h-10 text-[#6161FF]" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Welcome to your Workspaces</h2>
                        <p className="text-[14px] text-slate-500 mt-2 max-w-sm mx-auto mb-8">
                            Workspaces group boards together. Create your first workspace to start organizing your projects like a pro.
                        </p>
                        <button 
                            onClick={handleCreateWorkspace}
                            className="bg-[#6161FF] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            Create First Workspace
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {workspaces.map(ws => {
                            const boards = boardsByWorkspace[ws.id] || [];
                            return (
                                <div key={ws.id} className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded drop-shadow-sm flex items-center justify-center" style={{ backgroundColor: ws.color }}>
                                                <span className="text-white text-sm font-bold">{ws.name.charAt(0)}</span>
                                            </div>
                                            <h2 className="text-lg font-bold text-slate-800">{ws.name}</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleOpenTemplateModal(ws.id)}
                                                className="text-[13px] font-semibold text-[#6161FF] hover:bg-[#6161FF]/10 px-3 py-1.5 rounded transition-colors"
                                            >
                                                + New Board
                                            </button>
                                            <button 
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                                                onClick={() => { setSelectedWorkspace(ws); setIsSettingsOpen(true); }}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {boards.length === 0 ? (
                                        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/20">
                                            <p className="text-[14px] text-slate-500 font-medium">No boards in this workspace.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {boards.map(b => (
                                                <button 
                                                    key={b.id}
                                                    onClick={() => setActiveBoardId(b.id)}
                                                    className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#6161FF] hover:shadow-md transition-all text-left group flex flex-col items-start"
                                                >
                                                    <LayoutGrid className="w-6 h-6 text-slate-300 group-hover:text-[#6161FF] transition-colors mb-3" />
                                                    <h3 className="font-bold text-slate-800 text-[15px] truncate w-full">{b.title}</h3>
                                                    <span className="text-[12px] text-slate-400 mt-2 flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                        Active Board
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isSettingsOpen && selectedWorkspace && tenant_id && (
                <WorkspaceSettingsModal 
                    tenantId={tenant_id}
                    workspaceId={selectedWorkspace.id}
                    currentThemeColor={selectedWorkspace.color}
                    onClose={() => { setIsSettingsOpen(false); setSelectedWorkspace(null); }}
                    onThemeUpdated={async () => {
                        await loadData();
                    }}
                />
            )}

            {templateModalOpen && templateWorkspaceId && tenant_id && (
                <TemplateSelectorModal
                    tenantId={tenant_id}
                    workspaceId={templateWorkspaceId}
                    isOpen={true}
                    onClose={() => setTemplateModalOpen(false)}
                    onCreated={handleTemplateCreated}
                />
            )}
        </div>
    );
};

