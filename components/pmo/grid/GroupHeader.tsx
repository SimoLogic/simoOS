"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { PmoGroup } from "@/types/pmo.types";

interface GroupHeaderProps {
  group: PmoGroup;
  isExpanded: boolean;
  onToggle: () => void;
  taskCount: number;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({ group, isExpanded, onToggle, taskCount }) => {
  return (
    <div className="flex items-center w-full bg-white h-10 border-b border-gray-200 sticky top-0 z-10 hover:bg-gray-50 transition-colors cursor-pointer group/header relative" onClick={onToggle}>
      {/* Vibe Dynamic Left Border */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: group.color || "#6161FF" }}
      />
      
      <div className="pl-6 flex items-center gap-2">
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.1, ease: "easeOut" }} // productive-medium 100ms
        >
          <ChevronDown className="w-4 h-4" style={{ color: group.color || "#6161FF" }} />
        </motion.div>
        
        <h3 
            className="text-base font-medium select-none" 
            style={{ color: group.color || "#6161FF" }}
        >
          {group.title}
        </h3>
        
        <span className="text-gray-400 text-xs ml-2 select-none group-hover/header:text-gray-600 transition-colors">
          {taskCount} {taskCount === 1 ? 'Task' : 'Tasks'}
        </span>
      </div>
    </div>
  );
};
