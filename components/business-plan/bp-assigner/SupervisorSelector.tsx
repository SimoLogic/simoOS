
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Supervisor {
    eid: string;
    fullName: string;
}

interface SupervisorSelectorProps {
    allEmployees: Supervisor[];
    selectedEid: string;
    onChange: (eid: string) => void;
    placeholder?: string;
    excludeEid?: string; // To avoid circularity
}

export const SupervisorSelector: React.FC<SupervisorSelectorProps> = ({
    allEmployees,
    selectedEid,
    onChange,
    placeholder = "Select Supervisor",
    excludeEid
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selected = allEmployees.find(e => e.eid === selectedEid);

    const filtered = allEmployees.filter(e => {
        if (e.eid === excludeEid) return false;
        const q = search.toLowerCase();
        return e.fullName.toLowerCase().includes(q) || e.eid.toLowerCase().includes(q);
    });

    return (
        <div ref={containerRef} className="relative min-w-[140px]">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 h-8 px-2 rounded bg-white border border-slate-200 cursor-pointer transition-all hover:border-cobalt-blue/50",
                    isOpen && "ring-2 ring-cobalt-blue/20 border-cobalt-blue shadow-sm"
                )}
            >
                {selected ? (
                    <span className="text-[11px] font-medium text-slate-700 truncate">{selected.fullName}</span>
                ) : (
                    <span className="text-[11px] text-slate-400">{placeholder}</span>
                )}
                <ChevronDown className={cn("w-3 h-3 text-slate-400 ml-auto transition-transform", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden anima-fade-in-down w-[220px]">
                    <div className="p-2 bg-slate-50 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search leader..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:border-cobalt-blue"
                            />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                        <div
                            onClick={() => { onChange(""); setIsOpen(false); }}
                            className="px-3 py-2 text-[11px] text-slate-400 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                        >
                            None (Clear)
                        </div>
                        {filtered.map(emp => (
                            <div
                                key={emp.eid}
                                onClick={() => { onChange(emp.eid); setIsOpen(false); }}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 text-[11px] cursor-pointer transition-colors",
                                    selectedEid === emp.eid ? "bg-cobalt-blue/5 text-cobalt-blue" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{emp.fullName}</span>
                                        <span className="text-[9px] text-slate-400">{emp.eid}</span>
                                    </div>
                                </div>
                                {selectedEid === emp.eid && <Check className="w-3 h-3" />}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-3 py-4 text-center text-[11px] text-slate-400 italic">
                                No managers found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
