// ⚠️ Lee ARCHITECTURE.md antes de modificar este módulo
// PMO Module — My Plan Shell (Sprint 0 Placeholder)
// Este componente evoluciona con cada prompt del Plan Maestro PMO

"use client";

import React, { useState, useEffect } from "react";
import { 
    LayoutGrid, 
    Trello, 
    GanttChartSquare, 
    CalendarDays, 
    LayoutDashboard,
    Plus,
    Filter,
    ChevronDown,
    Zap,
    Lock,
    Plug
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardView } from "@/types/pmo.types";
import { GridView } from "@/components/pmo/views/GridView";
import { useSessionStore } from "@/lib/session-store";
import { getBoardsAction } from "@/app/actions/pmo/board-actions";
import { NewTaskModal } from "@/components/pmo/shared/NewTaskModal";
import IntegrationsPanel from "@/components/pmo/integrations/IntegrationsPanel";

// ─── VIBE TOKENS (no hardcodear — usar estos constants) ─────────────
const VIBE = {
    purple: "#6161FF",
    pink:   "#FF3D57",
    green:  "#00CA72",
    orange: "#FDAB3D",
    blue:   "#0086C0",
    mirage: "#181B34",
} as const;

type PmoView = BoardView | 'integrations';

interface ViewTab {
    id: PmoView;
    label: string;
    icon: React.ElementType;
}

const viewTabs: ViewTab[] = [
    { id: "grid",          label: "Grid",         icon: LayoutGrid },
    { id: "kanban",        label: "Kanban",       icon: Trello },
    { id: "gantt",         label: "Gantt",        icon: GanttChartSquare },
    { id: "calendar",      label: "Calendar",     icon: CalendarDays },
    { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard },
    { id: "integrations",  label: "Integrations", icon: Plug },
];

// Placeholder data — replaced by real DB data in Sprint 2+
const PLACEHOLDER_BOARD = {
    id: "board-demo-1",
    title: "My Playbook — Q2 2025",
    isPlaybookBoard: true,
    simoPlaybookId: "simo-playbook-demo-1",
    lastSyncedAt: "2026-03-11T01:43:00Z",
};

export const MyPlanShell: React.FC = () => {
    const [activeView, setActiveView] = useState<PmoView>("grid");
    const [isViewLocked, setIsViewLocked] = useState(false);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
    const [boardTitle, setBoardTitle] = useState(PLACEHOLDER_BOARD.title);
    const [isPlaybook, setIsPlaybook] = useState(false);
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { tenant_id } = useSessionStore();
    const orgId = tenant_id || 'TNT-001';

    // Auto-discover the first available board for this org
    useEffect(() => {
        async function discoverBoard() {
            try {
                const boards = await getBoardsAction(orgId);
                if (boards.length > 0) {
                    setActiveBoardId(boards[0].id);
                    setBoardTitle(boards[0].title);
                    setIsPlaybook(boards[0].isPlaybookBoard);
                    // Use the first group as default for new task creation
                    if (boards[0].groups && boards[0].groups.length > 0) {
                        setDefaultGroupId(boards[0].groups[0].id);
                    }
                }
            } catch (e) {
                console.error('[MyPlanShell] Failed to discover boards:', e);
            }
        }
        discoverBoard();
    }, [orgId]);

    return (
        <div className="flex flex-col h-full bg-white">
            
            {/* ── Board Header ── */}
            <div className="border-b border-[#E6E9EF] px-6 pt-5 pb-0">
                
                {/* Board title row */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" style={{ color: VIBE.purple }} />
                        <h1 className="text-xl font-semibold text-[#323338]">{boardTitle}</h1>
                    </div>

                    {/* Simo IS Badge — visible only on Playbook boards */}
                    {isPlaybook && (
                        <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase"
                            style={{ backgroundColor: `${VIBE.blue}18`, color: VIBE.blue }}
                        >
                            <Zap className="w-3 h-3" />
                            Simo IS
                        </span>
                    )}
                </div>

                {/* View Tabs + Actions */}
                <div className="flex items-center justify-between">
                    
                    {/* View selector tabs */}
                    <div className="flex items-center gap-0">
                        {viewTabs.map((tab) => {
                            const isActive = activeView === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveView(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all",
                                        "duration-[70ms]", // productive-short
                                        isActive 
                                            ? "border-b-2 text-[#323338]" 
                                            : "border-transparent text-[#676879] hover:text-[#323338] hover:bg-[#F5F6F8]"
                                    )}
                                    style={isActive ? { borderBottomColor: VIBE.purple } : {}}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pb-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[#676879] hover:bg-[#F5F6F8] transition-colors duration-[70ms]">
                            <Filter className="w-4 h-4" />
                            Filter
                        </button>
                        
                        <button
                            onClick={() => setIsViewLocked(!isViewLocked)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors duration-[70ms]",
                                isViewLocked 
                                    ? "text-[#6161FF] bg-[#6161FF]/10" 
                                    : "text-[#676879] hover:bg-[#F5F6F8]"
                            )}
                        >
                            <Lock className="w-4 h-4" />
                            {isViewLocked ? "Locked" : "Lock View"}
                        </button>

                        <button
                            onClick={() => setIsNewTaskOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white transition-all duration-[70ms] hover:opacity-90"
                            style={{ backgroundColor: VIBE.purple, borderRadius: "4px" }}
                        >
                            <Plus className="w-4 h-4" />
                            New Item
                            <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── View Area ── */}
            <div className="flex-1 overflow-hidden relative">
                {activeView === 'integrations' ? (
                    <IntegrationsPanel />
                ) : activeView === 'grid' && activeBoardId ? (
                    <GridView key={refreshKey} boardId={activeBoardId} orgId={orgId} />
                ) : (
                    <ViewPlaceholder view={activeView as BoardView} />
                )}
            </div>

            {/* ── New Task Modal ── */}
            {activeBoardId && defaultGroupId && (
                <NewTaskModal
                    boardId={activeBoardId}
                    groupId={defaultGroupId}
                    orgId={orgId}
                    isOpen={isNewTaskOpen}
                    onClose={() => setIsNewTaskOpen(false)}
                    onTaskCreated={() => setRefreshKey((k) => k + 1)}
                />
            )}
        </div>
    );
};

// ─── View Placeholder — replaced by real components in Sprints 4-5 ────
const viewMeta: Record<BoardView, { sprint: number; prompt: string; description: string }> = {
    grid:      { sprint: 4, prompt: "#21 + #22", description: "Virtualized table with 10,000+ rows, inline editing, Side Peek, and Simo IS protection" },
    kanban:    { sprint: 4, prompt: "#23",        description: "Cards with Vibe tokens, swimlanes, WIP limits, and Simo IS task barriers" },
    gantt:     { sprint: 5, prompt: "#24",        description: "Timeline with baselines, auto-schedule, and non-resizable Simo IS bars" },
    calendar:  { sprint: 5, prompt: "#25",        description: "Commercial calendar with WorkdayHelper — weekends and holidays dimmed" },
    dashboard: { sprint: 5, prompt: "#26",        description: "mondayDB widgets including Battery, Workload, and limit warnings" },
};

const ViewPlaceholder: React.FC<{ view: BoardView }> = ({ view }) => {
    const meta = viewMeta[view];
    const Icon = viewTabs.find(t => t.id === view)?.icon ?? LayoutGrid;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${VIBE.purple}15` }}
            >
                <Icon className="w-8 h-8" style={{ color: VIBE.purple }} />
            </div>
            
            <div className="max-w-md">
                <h3 className="text-lg font-semibold text-[#323338] mb-1">
                    {view.charAt(0).toUpperCase() + view.slice(1)} View
                </h3>
                <p className="text-sm text-[#676879] mb-3">
                    {meta.description}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${VIBE.orange}20`, color: VIBE.orange }}
                >
                    <Zap className="w-3 h-3" />
                    Sprint {meta.sprint} · Prompt {meta.prompt}
                </div>
            </div>

            {/* Simulated empty state grid for the Grid view */}
            {view === "grid" && (
                <div className="w-full max-w-2xl mt-4 border border-[#E6E9EF] rounded-lg overflow-hidden">
                    {/* Grid header */}
                    <div className="flex bg-[#F5F6F8] border-b border-[#E6E9EF]">
                        {["Task", "Status", "Assignee", "Due Date", "Priority"].map((col) => (
                            <div key={col} className="flex-1 px-3 py-2 text-[11px] font-semibold text-[#676879] uppercase tracking-wide border-r border-[#E6E9EF] last:border-r-0">
                                {col}
                            </div>
                        ))}
                    </div>
                    {/* Skeleton rows */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex border-b border-[#E6E9EF] last:border-b-0">
                            {[1, 2, 3, 4, 5].map((j) => (
                                <div key={j} className="flex-1 px-3 py-3 border-r border-[#E6E9EF] last:border-r-0">
                                    <div className="h-3 rounded animate-pulse" style={{ backgroundColor: "#E6E9EF", width: j === 1 ? "80%" : "60%" }} />
                                </div>
                            ))}
                        </div>
                    ))}
                    {/* Add item row */}
                    <button className="flex items-center gap-2 px-3 py-2 w-full text-sm text-[#676879] hover:bg-[#F5F6F8] transition-colors text-left">
                        <Plus className="w-4 h-4" />
                        Add item
                    </button>
                </div>
            )}
        </div>
    );
};
