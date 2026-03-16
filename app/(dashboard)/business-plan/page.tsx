import React from "react";
import { Rocket, Target, Users } from "lucide-react";

export const metadata = {
  title: "Overview — Business Plan | SIMO Intellisense",
  description: "High-level overview of the strategic objectives.",
};

export default function BusinessPlanOverviewPage() {
  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC] p-8 h-full text-slate-800 flex flex-col justify-center items-center gap-6">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shadow-inner">
         <Target size={32} className="text-[var(--cobalt-blue)]" />
      </div>
      <h1 className="text-2xl font-black uppercase tracking-tighter">Business Plan Overview</h1>
      <p className="text-slate-500 text-sm max-w-md text-center font-medium">
        Welcome to the Business Plan module. Use the horizontal navigation above to access the Playbook Designer.
      </p>
    </div>
  );
}
