"use client";
// TagsCell.tsx — Multi-select tag system with Vibe colors
// Stores array of strings in custom_field_values JSONB: ["tag1", "tag2"]
// Supports inline tag creation with random Vibe palette colors

import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { usePmoStore } from "@/lib/stores/pmo.store";
import { useSessionStore } from "@/lib/session-store";
import { updateCustomFieldValueAction } from "@/app/actions/pmo/column-actions";
import type { PmoTask } from "@/types/pmo.types";

// Vibe palette for tags — never use plain red/blue
const TAG_COLORS = [
  "#6161FF", "#00CA72", "#FDAB3D", "#FF3D57", "#0086C0",
  "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
];

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

interface Props {
  task:     PmoTask;
  fieldKey: string;
  options?: string[]; // preset options from column.settings.options
}

export function TagsCell({ task, fieldKey, options = [] }: Props) {
  const optimisticTasks   = usePmoStore(s => s.optimisticTasks);
  const setOptimisticTask = usePmoStore(s => s.setOptimisticTaskUpdate);
  const { tenant_id }     = useSessionStore();

  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState("");
  const containerRef      = useRef<HTMLDivElement>(null);

  const rawVal = (optimisticTasks[task.id] as Record<string, unknown> | undefined)?.[fieldKey]
    ?? task.customFieldValues?.[fieldKey];
  const tags: string[] = Array.isArray(rawVal) ? (rawVal as string[]) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const persist = async (newTags: string[]) => {
    setOptimisticTask(task.id, { [fieldKey]: newTags } as Partial<PmoTask>);
    if (tenant_id) {
      await updateCustomFieldValueAction(task.id, task.boardId, tenant_id, fieldKey, newTags);
    }
  };

  const addTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    await persist([...tags, trimmed]);
    setInput("");
  };

  const removeTag = async (tag: string) => {
    await persist(tags.filter(t => t !== tag));
  };

  // suggestions = preset options not yet selected, filtered by input
  const suggestions = [
    ...options.filter(o => !tags.includes(o) && o.toLowerCase().includes(input.toLowerCase())),
    ...(input.trim() && !tags.includes(input.trim()) && !options.includes(input.trim())
      ? [`Create "${input.trim()}"`] : []),
  ];

  return (
    <div
      ref={containerRef}
      className="relative flex items-center flex-wrap gap-1 px-1.5 py-1 w-full min-h-8 cursor-pointer"
      onClick={e => { e.stopPropagation(); setOpen(true); }}
      id={`tags-cell-${task.id}-${fieldKey}`}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
          style={{ backgroundColor: tagColor(tag) }}
        >
          {tag}
          {open && (
            <button
              onClick={e => { e.stopPropagation(); removeTag(tag); }}
              className="ml-0.5 hover:opacity-80"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}

      {tags.length === 0 && !open && (
        <span className="text-[12px] text-slate-300 px-1">Add tags…</span>
      )}

      {open && (
        <div
          className="absolute top-full left-0 z-[70] mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl"
          style={{ minWidth: 200 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Search or create tag…"
              className="flex-1 text-[13px] focus:outline-none placeholder:text-slate-300"
              onKeyDown={e => {
                if (e.key === "Enter") addTag(input);
                if (e.key === "Escape") { setOpen(false); setInput(""); }
              }}
            />
          </div>
          {suggestions.length > 0 && (
            <div className="py-1 max-h-40 overflow-y-auto">
              {suggestions.map(s => {
                const isCreate = s.startsWith('Create "');
                const tagVal = isCreate ? input.trim() : s;
                return (
                  <button
                    key={s}
                    onClick={() => addTag(tagVal)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left text-[13px]"
                  >
                    {!isCreate && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tagColor(tagVal) }}
                      />
                    )}
                    <span className={isCreate ? "text-[#6161FF] font-medium" : "text-[#323338]"}>
                      {s}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
