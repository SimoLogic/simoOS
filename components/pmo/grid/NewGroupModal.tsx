"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, color: string) => Promise<void>;
}

const VIBE_COLORS = [
  "#6161FF", // Cobalt
  "#00CA72", // Emerald
  "#FDAB3D", // Amber
  "#E5484D", // Red
  "#9F7AEA", // Purple
  "#4A5568", // Gray
];

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(VIBE_COLORS[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onSubmit(title, color);
      setTitle("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden flex flex-col motion-preset-slide-up-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-800">New Group</h2>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Group Name</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Backlog, Sprint 1, In Review"
              className="px-3 py-2 border border-slate-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-[#6161FF] focus:border-transparent"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Group Color</label>
            <div className="flex items-center gap-2">
              {VIBE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#6161FF] hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
