// ⚠️ Read ARCHITECTURE.md before modifying this module
// PMO Module — My Plan Shell
// S-01 + S-03 to S-07: All 5 views connected.

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
    Plug,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardView, PmoBoard } from "@/types/pmo.types";
import { GridView } from "@/components/pmo/views/GridView";
import { KanbanView } from "@/components/pmo/views/KanbanView";
import GanttView from "@/components/pmo/views/GanttView";
import { CalendarView } from "@/components/pmo/views/CalendarView";
import { DashboardEngine } from "@/components/pmo/views/DashboardEngine";
import { useSessionStore } from "@/lib/session-store";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { getBoardsAction, getBoardAction } from "@/app/actions/pmo/board-actions";
import { NewTaskModal } from "@/components/pmo/shared/NewTaskModal";
import IntegrationsPanel from "@/components/pmo/integrations/IntegrationsPanel";
import { PlaybookAssignmentPanel } from "@/components/shared/PlaybookAssignmentPanel";

// ─── VIBE TOKENS ─────────────────────────────────────────────────────────────
const VIBE = {
    purple: "#6161FF",
    pink:   "#FF3D57",
    green:  "#00CA72",
    orange: "#FDAB3D",
    blue:   "#0086C0",
    mirage: "#181B34",
} as const;

type PmoView = BoardView | "integrations";

const viewTabs = [
    { id: "grid"         as PmoView, label: "Grid",         icon: LayoutGrid },
    { id: "kanban"       as PmoView, label: "Kanban",       icon: Trello },
    { id: "gantt"        as PmoView, label: "Gantt",        icon: GanttChartSquare },
    { id: "calendar"     as PmoView, label: "Calendar",     icon: CalendarDays },
    { id: "dashboard"    as PmoView, label: "Dashboard",    icon: LayoutDashboard },
    { id: "integrations" as PmoView, label: "Integrations", icon: Plug },
];

export const MyPlanShell: React.FC = () => {
    const [activeView, setActiveView]         = useState<PmoView>("grid");
    const [isViewLocked, setIsViewLocked]     = useState(false);
    const [activeBoardId, setActiveBoardId]   = useState<string | null>(null);
    const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
    const [boardTitle, setBoardTitle]         = useState("My Plan");
    const [isPlaybook, setIsPlaybook]         = useState(false);
    const [isNewTaskOpen, setIsNewTaskOpen]   = useState(false);
    const [isAssignOpen, setIsAssignOpen]     = useState(false);
    const [refreshKey, setRefreshKey]         = useState(0);
    const [fullBoard, setFullBoard]           = useState<PmoBoard | null>(null);
    const [boardLoading, setBoardLoading]     = useState(false);

    const { tenant_id }    = useSessionStore();
    const orgId            = tenant_id || "TNT-001";
    const optimisticTasks  = usePmoStore(s => s.optimisticTasks);

    // ── Discover first board ────────────────────────────────────────────────
    useEffect(() => {
        async function discover() {
            try {
                const boards = await getBoardsAction(orgId);
                if (boards.length > 0) {
                    const b = boards[0];
                    setActiveBoardId(b.id);
                    setBoardTitle(b.title);
                    setIsPlaybook(b.isPlaybookBoard);
                    if (b.groups?.length) setDefaultGroupId(b.groups[0].id);
                }
            } catch (e) {
                console.error("[MyPlanShell] discover:", e);
            }
        }
        discover();
    }, [orgId]);

    // ── Load full board for views that need it ──────────────────────────────
    useEffect(() => {
        if (!activeBoardId) return;
        const needsFull = ["kanban", "gantt", "calendar"].includes(activeView);
        if (!needsFull) return;
        if (fullBoard?.id === activeBoardId) return;

        setBoardLoading(true);
        getBoardAction(activeBoardId, orgId)
            .then(r => { if (r.success) setFullBoard(r.data); })
            .catch(e => console.error("[MyPlanShell] getBoardAction:", e))
            .finally(() => setBoardLoading(false));
    }, [activeView, activeBoardId, orgId, fullBoard?.id]);

    const handleTaskCreated = () => {
        setRefreshKey(k => k + 1);
        setFullBoard(null);
    };

    // ── View renderer ────────────────────────────────────────────────────────
    const renderView = () => {
        if (activeView === "integrations") return <IntegrationsPanel />;

        if (activeView === "grid") {
            if (!activeBoardId) return <EmptyBoardState />;
            return <GridView key={refreshKey} boardId={activeBoardId} orgId={orgId} isReadOnly={isViewLocked} />;
        }

        if (activeView === "dashboard") {
            if (!activeBoardId) return <EmptyBoardState />;
            return <DashboardEngine boardId={activeBoardId} orgId={orgId} isReadOnly={isViewLocked} />;
        }

        // Kanban / Gantt / Calendar — need full board object
        if (boardLoading) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: VIBE.purple }} />
                </div>
            );
        }
        if (!fullBoard) return <EmptyBoardState />;

        if (activeView === "kanban") {
            return <KanbanView board={fullBoard} optimisticTasks={optimisticTasks} isReadOnly={isViewLocked} />;
        }
        if (activeView === "gantt") {
            return (
                <GanttView
                    board={fullBoard}
                    orgCountryCode="CO"
                    filterStatus={null}
                    filterAssignee={null}
                    optimisticTasks={optimisticTasks}
                    isReadOnly={isViewLocked}
                />
            );
        }
        if (activeView === "calendar") {
            if (!activeBoardId) return <EmptyBoardState />;
            return <CalendarView boardId={activeBoardId} orgId={orgId} />;
        }

        return <EmptyBoardState />;
    };

    return (
        <div className="flex flex-col h-full bg-white">

            {/* ── Board Header ── */}
            <div className="border-b border-[#E6E9EF] px-6 pt-5 pb-0">

                {/* Title row */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" style={{ color: VIBE.purple }} />
                        <h1 className="text-xl font-semibold text-[#323338]">{boardTitle}</h1>
                    </div>
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

                {/* View tabs + actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {viewTabs.map(tab => {
                            const isActive = activeView === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveView(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-[70ms]",
                                        isActive
                                            ? "text-[#323338]"
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

                    <div className="flex items-center gap-2 pb-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[#676879] hover:bg-[#F5F6F8] transition-colors">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                        <button
                            onClick={() => setIsViewLocked(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors",
                                isViewLocked ? "text-[#6161FF] bg-[#6161FF]/10" : "text-[#676879] hover:bg-[#F5F6F8]"
                            )}
                        >
                            <Lock className="w-4 h-4" />
                            {isViewLocked ? "Locked" : "Lock View"}
                        </button>
                        <button
                            onClick={() => setIsAssignOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-all"
                            style={{ backgroundColor: `${VIBE.blue}18`, color: VIBE.blue }}
                        >
                            <Zap className="w-4 h-4" /> Assign Playbook
                        </button>
                        <button
                            onClick={() => setIsNewTaskOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white hover:opacity-90 transition-all"
                            style={{ backgroundColor: VIBE.purple }}
                        >
                            <Plus className="w-4 h-4" /> New Item
                            <ChevronDown className="w-3 h-3 opacity-70 ml-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── View Area ── */}
            <div className="flex-1 overflow-hidden relative">
                {renderView()}
            </div>

            {/* ── Modals ── */}
            {activeBoardId && defaultGroupId && (
                <NewTaskModal
                    boardId={activeBoardId}
                    groupId={defaultGroupId}
                    orgId={orgId}
                    isOpen={isNewTaskOpen}
                    onClose={() => setIsNewTaskOpen(false)}
                    onTaskCreated={handleTaskCreated}
                />
            )}
            {isAssignOpen && (
                <PlaybookAssignmentPanel
                    mode="employee-first"
                    orgId={orgId}
                    onClose={() => setIsAssignOpen(false)}
                />
            )}
        </div>
    );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyBoardState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#6161FF]/10">
            <LayoutGrid className="w-8 h-8 text-[#6161FF]" />
        </div>
        <div className="max-w-sm">
            <h3 className="text-lg font-semibold text-[#323338] mb-1">No board found</h3>
            <p className="text-sm text-[#676879]">
                Assign a Playbook to generate your first board, or create one from My Projects.
            </p>
        </div>
    </div>
);
