"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, MoreHorizontal, Check, Edit2, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { PmoGroup } from "@/types/pmo.types";

const VIBE_COLORS = ["#6161FF", "#00CA72", "#FDAB3D", "#E5484D", "#9F7AEA", "#4A5568"];

interface GroupHeaderProps {
  group: PmoGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: (title: string, color: string) => void;
  taskCount: number;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ group, isExpanded, onToggle, onUpdate, taskCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(group.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (title.trim() !== group.title && onUpdate) {
      onUpdate(title.trim(), group.color || "#6161FF");
    } else {
      setTitle(group.title);
    }
  };

  const handleColorSelect = (c: string) => {
    if (onUpdate) onUpdate(group.title, c);
    setIsMenuOpen(false);
  };

  return (
    <div className="flex items-center w-full bg-white h-10 border-b border-gray-200 sticky top-0 z-10 hover:bg-gray-50 transition-colors group/header relative">
      {/* Vibe Dynamic Left Border */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: group.color || "#6161FF" }}
      />
      
      <div className="pl-6 flex items-center gap-2 flex-1">
        <motion.button
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.1, ease: "easeOut" }} // productive-medium 100ms
          onClick={onToggle}
          className="p-1 rounded hover:bg-slate-200 focus:outline-none"
        >
          <ChevronDown className="w-4 h-4 cursor-pointer" style={{ color: group.color || "#6161FF" }} />
        </motion.button>
        
        {isEditing ? (
          <input 
            ref={inputRef}
            className="text-base font-medium bg-white border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-[#6161FF]"
            style={{ color: group.color || "#6161FF" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") {
                setTitle(group.title);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <h3 
              className="text-base font-medium select-none cursor-text hover:underline decoration-dashed underline-offset-4" 
              style={{ color: group.color || "#6161FF" }}
              onClick={() => setIsEditing(true)}
          >
            {group.title}
          </h3>
        )}
        
        <span className="text-gray-400 text-xs ml-2 select-none group-hover/header:text-gray-600 transition-colors">
          {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
        </span>
      </div>

      {/* Action Menu */}
      <div className="pr-4 relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 opacity-0 group-hover/header:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 motion-preset-slide-up-sm">
            <button 
              onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Rename Group
            </button>
            <div className="px-3 py-1.5 border-t border-slate-100 mt-1 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <Palette className="w-3 h-3" /> Color Palette
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {VIBE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    className="w-5 h-5 rounded-full hover:scale-110 transition-transform flex items-center justify-center border border-black/10"
                    style={{ backgroundColor: c }}
                  >
                     {group.color === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
