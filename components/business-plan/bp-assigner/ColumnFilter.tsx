"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Filter, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnFilterProps {
    title: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    isLoading?: boolean;
}

export const ColumnFilter: React.FC<ColumnFilterProps> = ({
    title,
    options,
    selected,
    onChange,
    isLoading
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

    const filteredOptions = useMemo(() => {
        const q = search.toLowerCase();
        return options.filter(opt => opt.toLowerCase().includes(q));
    }, [options, search]);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    const toggleAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    const isAllSelected = selected.length === options.length && options.length > 0;
    const isSomeSelected = selected.length > 0 && selected.length < options.length;

    return (
        <div ref={containerRef} className="relative inline-block w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between gap-1 px-2 py-1 text-[10px] font-bold border rounded-md transition-all",
                    selected.length > 0
                        ? "bg-cobalt-blue text-white border-cobalt-blue shadow-sm"
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                )}
            >
                <div className="flex items-center gap-1 overflow-hidden">
                    <Filter className={cn("w-3 h-3 shrink-0", selected.length > 0 ? "text-white" : "text-slate-400")} />
                    <span className="truncate">{selected.length > 0 ? `${selected.length} Selected` : `All ${title}`}</span>
                </div>
                {selected.length > 0 && (
                    <X
                        className="w-2.5 h-2.5 hover:text-action-red transition-colors"
                        onClick={(e) => { e.stopPropagation(); onChange([]); }}
                    />
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[200px] max-w-[250px] bg-white border border-slate-200 rounded-lg shadow-2xl z-[60] overflow-hidden anima-fade-in-down">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${title}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:border-cobalt-blue"
                            />
                        </div>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto py-1">
                        {/* Select All */}
                        <div
                            onClick={toggleAll}
                            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                        >
                            <div className={cn(
                                "w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors",
                                isAllSelected ? "bg-cobalt-blue border-cobalt-blue" : isSomeSelected ? "bg-cobalt-blue/50 border-cobalt-blue" : "border-slate-300"
                            )}>
                                {(isAllSelected || isSomeSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="font-bold text-navy-blue">(Select All)</span>
                        </div>

                        {filteredOptions.map((opt) => (
                            <div
                                key={opt}
                                onClick={() => toggleOption(opt)}
                                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <div className={cn(
                                    "w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors",
                                    selected.includes(opt) ? "bg-cobalt-blue border-cobalt-blue" : "border-slate-300"
                                )}>
                                    {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-slate-600 truncate">{opt || "(Empty)"}</span>
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                                No options found
                            </div>
                        )}
                    </div>

                    {selected.length > 0 && (
                        <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center px-3">
                            <span className="text-[10px] font-bold text-slate-400">{selected.length} items selected</span>
                            <button
                                onClick={() => onChange([])}
                                className="text-[10px] font-black text-action-red uppercase hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
