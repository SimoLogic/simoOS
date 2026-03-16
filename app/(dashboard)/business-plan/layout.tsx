"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BusinessPlanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "OVERVIEW",
      href: "/business-plan",
      icon: LayoutDashboard,
      isActive: pathname === "/business-plan",
    },
    {
      name: "PLAYBOOK DESIGNER",
      href: "/business-plan/playbook-designer",
      icon: Zap,
      isActive: pathname.startsWith("/business-plan/playbook-designer"),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Horizontal Tabs / Sub-module Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-6 z-30 shadow-sm shrink-0">
        <div className="text-sm font-black text-slate-800 uppercase tracking-tighter mr-4 border-r border-slate-100 pr-6 flex items-center gap-2">
           <LayoutDashboard size={16} className="text-[var(--cobalt-blue)]" />
           <span>BUSINESS PLAN</span>
        </div>
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 py-2 px-1 text-[10px] font-black uppercase tracking-widest relative transition-all group",
                tab.isActive ? "text-[var(--cobalt-blue)]" : "text-slate-400 hover:text-slate-800"
              )}
            >
              <tab.icon size={14} className={cn(tab.isActive ? "text-[var(--cobalt-blue)]" : "text-slate-400 group-hover:text-slate-600")} />
              {tab.name}
              {tab.isActive && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[var(--cobalt-blue)] rounded-t-full shadow-[0_-2px_10px_rgba(0,86,192,0.3)]"></div>
              )}
            </Link>
          ))}
        </nav>
      </header>
      
      {/* Page Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
