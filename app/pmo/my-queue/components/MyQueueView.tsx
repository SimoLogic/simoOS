"use client";

import React, { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { 
    CheckCircle, ListTodo, ClipboardList, AlertCircle, 
    X, ChevronRight, Inbox, RefreshCw, Briefcase, ExternalLink, BellRing
} from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { useMyQueueStore } from "@/lib/stores/my-queue-store";
import { getNotificationsAction, markNotificationReadAction, SimoNotification } from "@/lib/actions/my-queue-actions";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
    APPROVAL: CheckCircle,
    TASK: ListTodo,
    FORM: ClipboardList,
    ALERT: AlertCircle
};

const typeColors: Record<string, string> = {
    APPROVAL: "text-emerald-500 bg-emerald-500/10",
    TASK: "text-[var(--cobalt-blue)] bg-[var(--cobalt-blue)]/10",
    FORM: "text-[var(--vibe-purple)] bg-[var(--vibe-purple)]/10",
    ALERT: "text-[var(--action-red)] bg-[var(--action-red)]/10"
};

export default function MyQueueView() {
    const { tenant_id, user_ide } = useSessionStore();
    const { decrementUnread, fetchUnreadCount } = useMyQueueStore();

    const [notifications, setNotifications] = useState<SimoNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState<SimoNotification | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async (refresh = false) => {
        if (!tenant_id || !user_ide) return;
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const data = await getNotificationsAction(tenant_id, user_ide);
            setNotifications(data);
            if (refresh) fetchUnreadCount(tenant_id, user_ide);
        } catch (err) {
            console.error("Failed to load queue:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tenant_id, user_ide]);

    const handleSelect = async (notif: SimoNotification) => {
        setSelectedNotif(notif);
        if (notif.status === 'PENDING') {
            // Optimistic Update
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'READ' } : n));
            decrementUnread();
            try {
                await markNotificationReadAction(notif.id);
            } catch (err) {
                // Revert if failed
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'PENDING' } : n));
            }
        }
    };

    // Grouping: APPROVAL -> TASK -> FORM -> ALERT
    const typeOrder = ['APPROVAL', 'TASK', 'FORM', 'ALERT'];
    
    const groupedData = useMemo(() => {
        const groups: Record<string, SimoNotification[]> = {
            APPROVAL: [], TASK: [], FORM: [], ALERT: []
        };
        notifications.forEach(n => {
            if (groups[n.type]) groups[n.type].push(n);
        });
        return groups;
    }, [notifications]);

    const hasNoItems = notifications.length === 0;

    return (
        <div className="flex h-full bg-white relative overflow-hidden">
            {/* Main List Area */}
            <div className={cn(
                "flex-1 flex flex-col transition-all duration-[var(--motion-expressive-short)]",
                selectedNotif ? "mr-[400px]" : "mr-0"
            )}>
                {/* Header Section */}
                <div className="px-8 py-6 border-b border-neutral-200 bg-white sticky top-0 z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-[var(--deep-navy)] tracking-tight">My Queue</h1>
                        <p className="text-sm text-neutral-500 mt-1">Tu bandeja de pendientes y aprobaciones.</p>
                    </div>
                    <button 
                        onClick={() => loadData(true)}
                        className="p-2 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 relative scrollbar-none">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <RefreshCw className="w-8 h-8 animate-spin text-[var(--cobalt-blue)] mb-4" />
                            <p className="text-sm text-[var(--deep-navy)]">Cargando tu fila de pendientes...</p>
                        </div>
                    ) : hasNoItems ? (
                        <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center mb-4">
                                <Inbox className="w-8 h-8 text-neutral-300" />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--deep-navy)] mb-2">No tienes pendientes por ahora</h3>
                            <p className="text-sm text-neutral-500">
                                Tu fila está vacía. Cualquier aprobación, formulario o alertará aparecerá aquí de forma automática.
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
                            {typeOrder.map(type => {
                                const items = groupedData[type];
                                if (!items || items.length === 0) return null;
                                
                                const Icon = typeIcons[type] || BellRing;
                                const colorClass = typeColors[type] || "text-neutral-500 bg-neutral-100";

                                return (
                                    <div key={type} className="space-y-3">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className={cn("p-1.5 rounded-md", colorClass)}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <h2 className="text-sm font-bold text-[var(--deep-navy)] uppercase tracking-wider">{type}</h2>
                                            <div className="ml-2 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                                                {items.length}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {items.map(item => {
                                                const isUnread = item.status === 'PENDING';
                                                const isSelected = selectedNotif?.id === item.id;
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => handleSelect(item)}
                                                        className={cn(
                                                            "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                                                            isSelected ? "border-[var(--cobalt-blue)] bg-[var(--cobalt-blue)]/5 ring-1 ring-[var(--cobalt-blue)]" 
                                                            : isUnread ? "border-neutral-200 bg-white hover:border-[var(--cobalt-blue)]/50 hover:shadow-md" 
                                                            : "border-neutral-100 bg-neutral-50 opacity-80 hover:opacity-100"
                                                        )}
                                                    >
                                                        {/* Status Indicator */}
                                                        <div className="w-2 flex justify-center">
                                                            {isUnread && <div className="w-2 h-2 rounded-full bg-[var(--action-red)]" />}
                                                        </div>

                                                        {/* Module Tag */}
                                                        <div className="w-24 shrink-0">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md">
                                                                {item.module}
                                                            </span>
                                                        </div>

                                                        {/* Title */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className={cn(
                                                                "text-sm truncate transition-colors",
                                                                isUnread ? "font-semibold text-[var(--deep-navy)]" : "font-medium text-neutral-600",
                                                                isSelected && "text-[var(--cobalt-blue)]"
                                                            )}>
                                                                {item.title}
                                                            </h4>
                                                        </div>

                                                        {/* Time Elapsed */}
                                                        <div className="whitespace-nowrap text-xs text-neutral-400 font-medium">
                                                            Hace {formatDistanceToNow(new Date(item.created_at), { locale: es })}
                                                        </div>

                                                        {/* Chevron */}
                                                        <div className="text-neutral-300 group-hover:text-[var(--cobalt-blue)] transition-colors">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Side Peek Panel */}
            <div className={cn(
                "absolute top-0 right-0 h-full w-[400px] bg-neutral-50 border-l border-neutral-200 shadow-2xl transition-transform duration-[var(--motion-expressive-short)] flex flex-col z-20",
                selectedNotif ? "translate-x-0" : "translate-x-full"
            )}>
                {selectedNotif && (
                    <>
                        <div className="px-6 py-5 border-b border-neutral-200 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-md", typeColors[selectedNotif.type] || "bg-neutral-100")}>
                                    {React.createElement(typeIcons[selectedNotif.type] || BellRing, { className: "w-4 h-4" })}
                                </div>
                                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{selectedNotif.type}</span>
                            </div>
                            <button 
                                onClick={() => setSelectedNotif(null)}
                                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
                            <div className="mb-6">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-200/50 px-2 py-1 rounded-md mb-3">
                                    <Briefcase className="w-3 h-3" />
                                    Módulo {selectedNotif.module}
                                </span>
                                <h2 className="text-xl font-semibold text-[var(--deep-navy)] leading-snug">
                                    {selectedNotif.title}
                                </h2>
                                <p className="text-xs text-neutral-400 mt-2 font-medium">
                                    Recibido el {new Date(selectedNotif.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            {selectedNotif.summary && (
                                <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm mb-6">
                                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Desglose</h3>
                                    <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                                        {selectedNotif.summary}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-white border-t border-neutral-200">
                            <a 
                                href={selectedNotif.action_url}
                                className="w-full py-3 px-4 bg-[var(--cobalt-blue)] hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-md shadow-[var(--cobalt-blue)]/20 hover:shadow-lg hover:-translate-y-0.5 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--cobalt-blue)]"
                                onClick={(e) => {
                                    if(selectedNotif.action_url === '#' || !selectedNotif.action_url) e.preventDefault();
                                }}
                            >
                                <span>Ir a resolver</span>
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
