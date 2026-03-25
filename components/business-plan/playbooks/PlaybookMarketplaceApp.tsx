"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, BookOpen, Clock, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { getActiveRoleTitlesForPlaybookAction } from "@/app/actions/business-plan-actions";
import { getPublishedPlaybooksAction } from "@/app/actions/playbook-assignment-actions";
import { useTenant } from "@/lib/tenant-context";
import { PlaybookPreviewModal } from "./PlaybookPreviewModal";

export const PlaybookMarketplaceApp: React.FC = () => {
  const { currentTenant } = useTenant();
  const orgId = currentTenant?.tenant_id;

  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [roleTitles, setRoleTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [selectedPlaybook, setSelectedPlaybook] = useState<any | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const fetchMarketplaceData = async () => {
      setLoading(true);
      const [pbData, rtData] = await Promise.all([
        getPublishedPlaybooksAction(orgId),
        getActiveRoleTitlesForPlaybookAction(orgId)
      ]);
      setPlaybooks(pbData);
      setRoleTitles(rtData.map((r: any) => r.role_title));
      setLoading(false);
    };
    fetchMarketplaceData();
  }, [orgId]);

  // Derived filtered results
  const filteredPlaybooks = playbooks.filter((pb) => {
    const term = search.toLowerCase();
    const matchSearch = pb.name?.toLowerCase().includes(term) || pb.purpose?.toLowerCase().includes(term);
    const matchType = typeFilter ? pb.type === typeFilter : true;
    const matchFamily = familyFilter ? pb.family === familyFilter : true;
    const matchStrategy = strategyFilter ? pb.strategy === strategyFilter : true;
    
    // Check if the current roleFilter exists in the playbook's responsibles (steps)
    let matchRole = true;
    if (roleFilter) {
      matchRole = pb.bp_playbook_steps?.some((step: any) => step.stakeholder === roleFilter || step.requested_to === roleFilter);
    }

    return matchSearch && matchType && matchFamily && matchStrategy && matchRole;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-8 py-8 shrink-0 relative overflow-hidden">
        {/* Background Graphic */}
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" stroke="#002B5B" strokeWidth="10" fill="none" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-navy-blue flex items-center gap-3 relative z-10">
          <BookOpen className="text-[var(--cobalt-blue)]" size={28} />
          PLAYBOOK MARKETPLACE
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mt-2 relative z-10 text-sm">
          Explore and assign verified institutional playbooks tailored to your operational and commercial teams.
        </p>

        {/* Filters Toolbar */}
        <div className="mt-8 flex flex-wrap gap-4 items-center relative z-10">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search playbook name or mission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white border border-slate-200 rounded text-xs px-2 py-1.5 font-bold text-slate-700 outline-none cursor-pointer">
              <option value="">ALL TYPES</option>
              <option value="CORE">CORE</option>
              <option value="GROWTH">GROWTH</option>
              <option value="ELITE">ELITE</option>
            </select>
            <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} className="bg-white border border-slate-200 rounded text-xs px-2 py-1.5 font-bold text-slate-700 outline-none cursor-pointer">
              <option value="">ALL FAMILIES</option>
              <option value="COMMERCIAL">COMMERCIAL</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
            </select>
            <select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)} className="bg-white border border-slate-200 rounded text-xs px-2 py-1.5 font-bold text-slate-700 outline-none cursor-pointer">
              <option value="">ALL STRATEGIES</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="NPPM">NPPM</option>
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-white border border-slate-200 rounded text-xs px-2 py-1.5 font-bold text-slate-700 outline-none cursor-pointer max-w-[150px]">
              <option value="">ALL ROLES</option>
              {roleTitles.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cobalt-blue)]"></div>
          </div>
        ) : filteredPlaybooks.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-20 text-slate-400">
            <ShieldAlert size={48} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-slate-300">No playbooks found</h3>
            <p className="text-sm">Try clearing your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlaybooks.map((pb) => (
              <div 
                key={pb.id}
                onClick={() => setSelectedPlaybook(pb)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all p-6 group cursor-pointer active:scale-[0.98] flex flex-col relative overflow-hidden"
              >
                {/* Decorative background shape */}
                <div className="absolute top-0 right-0 p-4 -mr-8 -mt-8 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <PlaybookDecoIcon type={pb.type} />
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge type={pb.type} />
                  <Badge type="info">{pb.family}</Badge>
                  <Badge type="outline">{pb.strategy}</Badge>
                </div>

                <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                  {pb.name}
                </h3>
                
                <p className="text-xs text-slate-500 mb-6 line-clamp-3 font-medium flex-1">
                  {pb.purpose || "No operational mission defined for this playbook."}
                </p>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{pb.bp_playbook_steps?.length || 0} STEPS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-2 py-1 rounded">
                    <span className="text-[9px] font-black uppercase tracking-widest">{pb.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlaybook && (
         <PlaybookPreviewModal 
            playbook={selectedPlaybook} 
            onClose={() => setSelectedPlaybook(null)} 
         />
      )}
    </div>
  );
};

// --- Helpers internal for this component ---

const Badge = ({ children, type }: { children?: React.ReactNode, type: string }) => {
  let styles = "bg-slate-100 text-slate-600";
  if (type === "CORE") styles = "bg-navy-blue text-white";
  else if (type === "GROWTH") styles = "bg-[#0056C0] text-white";
  else if (type === "ELITE") styles = "bg-indigo-600 text-white";
  else if (type === "info") styles = "bg-blue-50 text-blue-600";
  else if (type === "outline") styles = "border border-slate-200 text-slate-500";
  
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${styles}`}>
      {children || type}
    </span>
  );
};

const PlaybookDecoIcon = ({ type }: { type: string }) => {
  return (
    <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 22h20L12 2z" />
    </svg>
  );
};
