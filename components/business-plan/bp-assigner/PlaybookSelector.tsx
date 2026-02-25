
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Playbook } from "@/lib/bp-types";

interface PlaybookSelectorProps {
    allPlaybooks: Playbook[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
}

export const PlaybookSelector: React.FC<PlaybookSelectorProps> = ({
    allPlaybooks,
    selectedIds,
    onChange,
    placeholder = "Select Playbooks"
}) => {
    const [isOpen, setIsOpen] = useState(false);
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

    const togglePlaybook = (id: string) => {
        const newIds = selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id];
        onChange(newIds);
    };

    const removePlaybook = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedIds.filter(i => i !== id));
    };

    return (
        <div ref={containerRef} className="relative min-w-[200px]">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex flex-wrap items-center gap-1 min-h-[32px] px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer transition-all hover:border-cobalt-blue/50",
                    isOpen && "ring-2 ring-cobalt-blue/20 border-cobalt-blue"
                )}
            >
                {selectedIds.length === 0 ? (
                    <span className="text-xs text-slate-400">{placeholder}</span>
                ) : (
                    selectedIds.map(id => {
                        const playbook = allPlaybooks.find(p => p.id === id);
                        return (
                            <div key={id} className="flex items-center gap-1 bg-cobalt-blue/10 text-cobalt-blue px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-cobalt-blue/20">
                                {playbook?.name || id}
                                <X
                                    className="w-2.5 h-2.5 cursor-pointer hover:text-action-red transition-colors"
                                    onClick={(e) => removePlaybook(id, e)}
                                />
                            </div>
                        );
                    })
                )}
                <ChevronDown className={cn("w-3 h-3 text-slate-400 ml-auto transition-transform", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto anima-fade-in-down">
                    {allPlaybooks.map(playbook => {
                        const isSelected = selectedIds.includes(playbook.id);
                        return (
                            <div
                                key={playbook.id}
                                onClick={() => togglePlaybook(playbook.id)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors",
                                    isSelected ? "bg-cobalt-blue/5 text-cobalt-blue" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="font-semibold">{playbook.name}</span>
                                    <span className="text-[10px] text-slate-400">{playbook.category}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
