// ⚠️ Read ARCHITECTURE.md before modifying this module
// PMO Module — My Plan Shell  (S-16: Playbook Assignment Integration)
// Renders the employee's personal "My Plan" board — the deployed Playbook workspace.
// Mandatory boards/groups from Playbooks are read-only; personal tasks are free-form.

"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    CreditCard,
    Loader2,
    Shield,
    Handshake,
    LockKeyhole,
    BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardView, PmoBoard, TaskType } from "@/types/pmo.types";
import { GridView } from "@/components/pmo/views/GridView";
import { KanbanView } from "@/components/pmo/views/KanbanView";
import GanttView from "@/components/pmo/views/GanttView";
import { CalendarView } from "@/components/pmo/views/CalendarView";
import { DashboardEngine } from "@/components/pmo/views/DashboardEngine";
import { CardsView } from "@/components/pmo/views/CardsView";
import { useSessionStore } from "@/lib/session-store";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { getBoardAction } from "@/app/actions/pmo/board-actions";
import { getMyPlanBoardAction, type MyPlanBoardResult } from "@/app/actions/pmo/my-plan-actions";
import { NewTaskModal } from "@/components/pmo/shared/NewTaskModal";
import { BoardOnboarding } from "@/components/pmo/shared/BoardOnboarding";
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

// ─── TASK TYPE BADGE CONFIG ──────────────────────────────────────────────────
const TASK_TYPE_BADGES: Record<TaskType, { label: string; icon: React.ElementType; bg: string; text: string; border: string } | null> = {
    PLAYBOOK_TASK: {
        label: "Playbook",
        icon: Zap,
        bg: "bg-[#6161FF]/10",
        text: "text-[#6161FF]",
        border: "border-l-[#6161FF]",
    },
    SUPPORT_REQUEST: {
        label: "Support",
        icon: Handshake,
        bg: "bg-[#FDAB3D]/10",
        text: "text-[#FDAB3D]",
        border: "border-l-[#FDAB3D]",
    },
    PERSONAL_TASK: null, // No badge for personal tasks
};

type PmoView = BoardView | "integrations";

const viewTabs = [
    { id: "grid"         as PmoView, label: "Grid",         icon: LayoutGrid },
    { id: "kanban"       as PmoView, label: "Kanban",       icon: Trello },
    { id: "gantt"        as PmoView, label: "Gantt",        icon: GanttChartSquare },
    { id: "calendar"     as PmoView, label: "Calendar",     icon: CalendarDays },
    { id: "cards"        as PmoView, label: "Cards",        icon: CreditCard },
    { id: "dashboard"    as PmoView, label: "Dashboard",    icon: LayoutDashboard },
    { id: "integrations" as PmoView, label: "Integrations", icon: Plug },
];

export const MyPlanShell: React.FC = () => {
    const [activeView, setActiveView]         = useState<PmoView>("grid");
    const [isViewLocked, setIsViewLocked]     = useState(false);
    const [isNewTaskOpen, setIsNewTaskOpen]    = useState(false);
    const [isAssignOpen, setIsAssignOpen]      = useState(false);
    const [refreshKey, setRefreshKey]          = useState(0);
    const [fullBoard, setFullBoard]            = useState<PmoBoard | null>(null);
    const [boardLoading, setBoardLoading]      = useState(true);
    const [planData, setPlanData]              = useState<MyPlanBoardResult | null>(null);

    const { tenant_id, user_ide } = useSessionStore();
    const orgId            = tenant_id || "TNT-001";
    const employeeEid      = user_ide || "SYS-001";
    const optimisticTasks  = usePmoStore(s => s.optimisticTasks);

    // ── Discover My Plan board for this employee ────────────────────────────
    const loadMyPlan = useCallback(async () => {
        setBoardLoading(true);
        try {
            const result = await getMyPlanBoardAction(employeeEid, orgId);
            if (result.success && result.data) {
                setPlanData(result.data);
                setFullBoard(result.data.board);
            } else {
                setPlanData(null);
                setFullBoard(null);
            }
        } catch (e) {
            console.error("[MyPlanShell] loadMyPlan error:", e);
        } finally {
            setBoardLoading(false);
        }
    }, [employeeEid, orgId]);

    useEffect(() => { loadMyPlan(); }, [loadMyPlan]);

    // Reload after assignment or task creation
    const handleTaskCreated = () => {
        setRefreshKey(k => k + 1);
        loadMyPlan();
    };

    const board = planData?.board ?? null;
    const boardId = board?.id ?? null;
    const defaultGroupId = board?.groups?.[0]?.id ?? null;

    // ── Reload full board for views that need the full object ────────────────
    useEffect(() => {
        if (!boardId) return;
        const needsFull = ["kanban", "gantt", "calendar"].includes(activeView);
        if (!needsFull) return;
        if (fullBoard?.id === boardId) return;

        setBoardLoading(true);
        getBoardAction(boardId, orgId)
            .then(r => { if (r.success) setFullBoard(r.data); })
            .catch(e => console.error("[MyPlanShell] getBoardAction:", e))
            .finally(() => setBoardLoading(false));
    }, [activeView, boardId, orgId, fullBoard?.id]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const allTasks = board?.groups?.flatMap(g => g.tasks) ?? [];
    const playbookCount = allTasks.filter(t => t.taskType === "PLAYBOOK_TASK").length;
    const supportCount  = allTasks.filter(t => t.taskType === "SUPPORT_REQUEST").length;
    const blockedCount  = allTasks.filter(t => t.status === "blocked").length;
    const doneCount     = allTasks.filter(t => t.status === "done").length;

    // ── View renderer ────────────────────────────────────────────────────────
    const renderView = () => {
        if (activeView === "integrations") return <IntegrationsPanel />;

        // Loading
        if (boardLoading) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: VIBE.purple }} />
                </div>
            );
        }

        // Empty state — no playbooks assigned
        if (!board || !boardId) return <EmptyMyPlanState onAssign={() => setIsAssignOpen(true)} />;

        if (activeView === "grid") {
            return (
                <>
                    <BoardOnboarding boardId={boardId} />
                    <GridView key={refreshKey} boardId={boardId} orgId={orgId} isReadOnly={isViewLocked} />
                </>
            );
        }

        if (activeView === "cards") {
            return <CardsView boardId={boardId} orgId={orgId} isReadOnly={isViewLocked} mode="my-plan" />;
        }

        if (activeView === "dashboard") {
            return <DashboardEngine defaultBoardIds={[boardId]} orgId={orgId} isReadOnly={isViewLocked} />;
        }

        // Kanban / Gantt / Calendar — need full board object
        if (!fullBoard) {
            return (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: VIBE.purple }} />
                </div>
            );
        }

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
            return <CalendarView boardId={boardId} orgId={orgId} />;
        }

        return null;
    };

    return (
        <div className="flex flex-col h-full bg-white">

            {/* ── Board Header ── */}
            <div className="border-b border-[#E6E9EF] px-6 pt-5 pb-0">

                {/* Title row */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" style={{ color: VIBE.purple }} />
                        <h1 className="text-xl font-semibold text-[#323338]">
                            {board ? board.title : "My Plan"}
                        </h1>
                    </div>
                    {planData?.hasPlaybookTasks && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase"
                            style={{ backgroundColor: `${VIBE.blue}18`, color: VIBE.blue }}
                        >
                            <Zap className="w-3 h-3" />
                            Simo IS
                        </span>
                    )}
                </div>

                {/* Stats bar — S-16 task type counts */}
                {board && (
                    <div className="flex items-center gap-3 mb-3">
                        <StatPill icon={Zap} label="Playbook" count={playbookCount} color="#6161FF" />
                        <StatPill icon={Handshake} label="Support" count={supportCount} color="#FDAB3D" />
                        <StatPill icon={LockKeyhole} label="Blocked" count={blockedCount} color="#E5484D" />
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <span className="text-[11px] font-bold text-emerald-600">
                            {doneCount}/{allTasks.length} completed
                        </span>
                    </div>
                )}

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
            {boardId && defaultGroupId && (
                <NewTaskModal
                    boardId={boardId}
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
                    onClose={() => {
                        setIsAssignOpen(false);
                        // Reload after potential assignment
                        setTimeout(() => loadMyPlan(), 500);
                    }}
                />
            )}
        </div>
    );
};

// ─── Stat Pill Component ──────────────────────────────────────────────────────
const StatPill: React.FC<{
    icon: React.ElementType;
    label: string;
    count: number;
    color: string;
}> = ({ icon: Icon, label, count, color }) => (
    <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold"
        style={{ backgroundColor: `${color}12`, color }}
    >
        <Icon className="w-3 h-3" />
        {label}: {count}
    </div>
);

// ─── Empty State — No Playbooks Assigned ──────────────────────────────────────
const EmptyMyPlanState: React.FC<{ onAssign: () => void }> = ({ onAssign }) => (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[#6161FF]/10">
            <BookOpen className="w-10 h-10 text-[#6161FF]" />
        </div>
        <div className="max-w-md">
            <h3 className="text-xl font-bold text-[#323338] mb-2">No playbooks assigned yet</h3>
            <p className="text-sm text-[#676879] leading-relaxed">
                Your execution plan will appear here once a manager assigns you a Playbook.
                Each assigned Playbook creates a timeline of tasks, milestones, and deliverables
                for you to track and complete.
            </p>
        </div>
        <button
            onClick={onAssign}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg"
            style={{ backgroundColor: VIBE.purple }}
        >
            <Zap className="w-4 h-4" /> Assign a Playbook
        </button>
        <p className="text-xs text-[#C5C7D0]">
            Or create personal tasks from <strong>"My Projects"</strong> for free-form project management.
        </p>
    </div>
);
