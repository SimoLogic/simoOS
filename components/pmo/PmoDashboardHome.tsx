"use client";

import React from "react";
import { 
    CalendarDays, 
    Briefcase, 
    BellRing, 
    LayoutGrid, 
    ChevronRight,
    Clock
} from "lucide-react";
import { useSessionStore } from "@/lib/session-store";
import { useMyQueueStore } from "@/lib/stores/my-queue-store";

interface PmoDashboardHomeProps {
    onNavigate: (subModule: string) => void;
}

export const PmoDashboardHome: React.FC<PmoDashboardHomeProps> = ({ onNavigate }) => {
    const { user_name } = useSessionStore();
    const { unreadCount } = useMyQueueStore();

    const quickLinks = [
        { id: "my-plan", label: "My Plan", desc: "Tus Playbooks activos y cronogramas", icon: CalendarDays, color: "text-[#0086C0]", bg: "bg-[#0086C0]/10" },
        { id: "my-work", label: "My Work", desc: "Tus tareas diarias asignadas", icon: Briefcase, color: "text-[#00CA72]", bg: "bg-[#00CA72]/10" },
        { id: "my-queue", label: "My Queue", desc: "Triage y notificaciones rápidas", icon: BellRing, color: "text-[#FF3D57]", bg: "bg-[#FF3D57]/10", badge: unreadCount },
        { id: "my-projects", label: "My Projects", desc: "Tus tableros y espacios libres", icon: LayoutGrid, color: "text-[#6161FF]", bg: "bg-[#6161FF]/10" },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-white p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                        Hola, {user_name || "Equipo"} 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Bienvenido al Project Management Office. ¿Qué deseas hacer hoy?
                    </p>
                </div>

                {/* Quick Access */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map(link => (
                        <button
                            key={link.id}
                            onClick={() => onNavigate(link.id)}
                            className="bg-white border border-slate-200 rounded-xl p-5 text-left hover:shadow-md transition-all group flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center mb-4`}>
                                    <link.icon className={`w-5 h-5 ${link.color}`} />
                                </div>
                                {link.badge !== undefined && link.badge > 0 && (
                                    <span className="bg-[#FF3D57] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {link.badge} pendientes
                                    </span>
                                )}
                            </div>
                            <h3 className="text-base font-semibold text-slate-800 mb-1 group-hover:text-[#6161FF] transition-colors">{link.label}</h3>
                            <p className="text-xs text-slate-500 flex-1">{link.desc}</p>
                            <div className="mt-4 flex items-center text-[#6161FF] text-xs font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                Abrir <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Recent Boards (Mocked for S-01) */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tableros Recientes</h2>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center">
                        <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 mb-4">Aún no has visitado ningún tablero.</p>
                        <button 
                            onClick={() => onNavigate("my-projects")}
                            className="text-sm font-medium text-white bg-[#6161FF] hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                        >
                            Explorar Mis Proyectos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
