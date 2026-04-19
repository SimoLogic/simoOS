"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Search,
    CalendarDays,
    Briefcase,
    BellRing,
    LayoutGrid,
    Star,
    Clock,
    Plus,
    Trash2,
    Settings,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
    MoreHorizontal,
    ChevronDown
} from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { getWorkspacesAction, getBoardsAction } from "@/app/actions/pmo/board-actions";
import { usePmoStore } from "@/lib/stores/pmo.store";

interface PmoSidebarProps {
    activeSubModule: string;
    onSelectSubModule: (id: string) => void;
}

export const PmoSidebar: React.FC<PmoSidebarProps> = ({ activeSubModule, onSelectSubModule }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem("pmo_sidebar_collapsed");
        if (savedState) {
            setIsCollapsed(savedState === "true");
        }
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("pmo_sidebar_collapsed", String(newState));
    };

    const navItems = [
        { id: "my-plan", label: "My Plan", icon: CalendarDays },
        { id: "my-work", label: "My Work", icon: Briefcase },
        { id: "my-queue", label: "My Queue", icon: BellRing },
    ];

    // S-09 Dynamic Workspace Tree State
    const { tenant_id } = useSessionStore();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [boardsByWorkspace, setBoardsByWorkspace] = useState<Record<string, any[]>>({});
    const [expandedWs, setExpandedWs] = useState<Record<string, boolean>>({});
    
    // Zustand bindings
    const activeBoardId = usePmoStore(s => s.activeBoardId);
    const setActiveBoardId = usePmoStore(s => s.setActiveBoardId);

    useEffect(() => {
        if (!tenant_id) return;
        const load = async () => {
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
                
                // Expande el primer workspace por defecto
                if (wsData.length > 0) {
                    setExpandedWs({ [wsData[0].id]: true });
                }
            } catch (err) {
                console.error("Sidebar load error", err);
        };
        
        load();
        
        const handleUpdate = () => load();
        window.addEventListener("pmo-workspaces-updated", handleUpdate);
        return () => window.removeEventListener("pmo-workspaces-updated", handleUpdate);
    }, [tenant_id]);

    const toggleWs = (id: string) => {
        setExpandedWs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <aside
            className={cn(
                "relative flex flex-col border-r border-[#E6E9EF] bg-white transition-all duration-300 ease-in-out z-20 shrink-0",
                isCollapsed ? "w-[60px]" : "w-[220px]"
            )}
            style={{ transitionProperty: "width", transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
            {/* Collapse Toggle */}
            <button
                onClick={toggleCollapse}
                className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-[#E6E9EF] flex items-center justify-center shadow-sm hover:bg-slate-50 z-30 transition-transform"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {/* Search */}
            <div className={cn("p-4 shrink-0 transition-all", isCollapsed ? "px-3" : "px-4")}>
                <div className="relative flex items-center">
                    <Search className={cn("text-slate-400 shrink-0", isCollapsed ? "w-5 h-5 mx-auto" : "w-4 h-4 absolute left-3")} />
                    {!isCollapsed && (
                        <input
                            type="text"
                            placeholder="Buscar en PMO..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-transparent rounded-md text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#6161FF] focus:ring-1 focus:ring-[#6161FF] outline-none transition-all"
                        />
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-2">
                {/* My Work Section */}
                <div className="mb-6 px-3 flex flex-col gap-0.5">
                    {!isCollapsed && <h3 className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">My Work</h3>}
                    
                    {navItems.map(item => {
                        const isActive = activeSubModule === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelectSubModule(item.id)}
                                title={isCollapsed ? item.label : undefined}
                                className={cn(
                                    "flex items-center gap-3 rounded-md transition-colors group",
                                    isCollapsed ? "justify-center p-2 mx-auto" : "px-3 py-2 w-full",
                                    isActive 
                                        ? "bg-[#6161FF]/10 text-[#6161FF]" 
                                        : "text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                {!isCollapsed && <span className="text-[14px] font-medium truncate">{item.label}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* My Projects Section */}
                <div className="px-3 flex flex-col gap-0.5">
                    {!isCollapsed && (
                        <div className="flex items-center justify-between px-3 mb-2">
                            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">My Projects</h3>
                        </div>
                    )}
                    
                    <button
                        onClick={() => onSelectSubModule("my-projects")}
                        title={isCollapsed ? "My Projects" : undefined}
                        className={cn(
                            "flex items-center gap-3 rounded-md transition-colors group",
                            isCollapsed ? "justify-center p-2 mx-auto" : "px-3 py-2 w-full",
                            activeSubModule === "my-projects" 
                                ? "bg-[#6161FF]/10 text-[#6161FF]" 
                                : "text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="text-[14px] font-medium truncate">Todos los Tableros</span>}
                    </button>

                    {/* Dynamic Workspaces (S-09) */}
                    {!isCollapsed && workspaces.length > 0 && (
                        <div className="mt-2 space-y-3">
                            {workspaces.map(ws => {
                                const isExp = expandedWs[ws.id];
                                const boards = boardsByWorkspace[ws.id] || [];
                                
                                return (
                                    <div key={ws.id} className="flex flex-col">
                                        <div 
                                            className="pt-2 pb-1 px-3 flex items-center justify-between group cursor-pointer hover:bg-slate-50 rounded"
                                            onClick={() => toggleWs(ws.id)}
                                        >
                                            <div className="flex items-center gap-2 text-slate-700 min-w-0 pr-2">
                                                <div 
                                                    className="w-4 h-4 rounded text-[10px] flex items-center justify-center shrink-0" 
                                                    style={{ backgroundColor: `${ws.color}15`, color: ws.color }}
                                                >
                                                    {ws.icon || "w"}
                                                </div>
                                                <span className="text-[13px] font-bold truncate tracking-tight">{ws.name}</span>
                                            </div>
                                            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-300 transition-transform", !isExp && "-rotate-90")} />
                                        </div>
                                        
                                        {isExp && (
                                            <div className="pl-6 pr-2 mt-1 space-y-0.5">
                                                {boards.length === 0 ? (
                                                    <span className="text-[11px] text-slate-400 italic px-2">Vacio</span>
                                                ) : (
                                                    boards.map(b => (
                                                        <button 
                                                            key={b.id} 
                                                            onClick={() => {
                                                                setActiveBoardId(b.id);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-2 py-1.5 w-full text-left rounded-md transition-colors",
                                                                activeBoardId === b.id 
                                                                    ? "bg-[#6161FF]/10 text-[#6161FF]" 
                                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                                            )}
                                                        >
                                                            <LayoutGrid className={cn("w-3.5 h-3.5 shrink-0", activeBoardId === b.id ? "text-[#6161FF]" : "text-slate-400")} />
                                                            <span className={cn(
                                                                "text-[13px] truncate",
                                                                activeBoardId === b.id ? "font-bold" : "font-medium"
                                                            )}>
                                                                {b.title}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-3 border-t border-[#E6E9EF] flex flex-col gap-1 shrink-0">
                <button
                    title={isCollapsed ? "Papelera" : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-md transition-colors hover:bg-slate-50 text-slate-700",
                        isCollapsed ? "justify-center p-2 mx-auto" : "px-3 py-2 w-full"
                    )}
                >
                    <Trash2 className="w-4 h-4 shrink-0 text-slate-400" />
                    {!isCollapsed && <span className="text-[13px]">Papelera</span>}
                </button>
                <button
                    title={isCollapsed ? "Configuración" : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-md transition-colors hover:bg-slate-50 text-slate-700",
                        isCollapsed ? "justify-center p-2 mx-auto" : "px-3 py-2 w-full"
                    )}
                >
                    <Settings className="w-4 h-4 shrink-0 text-slate-400" />
                    {!isCollapsed && <span className="text-[13px]">Configuración</span>}
                </button>
            </div>
        </aside>
    );
};
