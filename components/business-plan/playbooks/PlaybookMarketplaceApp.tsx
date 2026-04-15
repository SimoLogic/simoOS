"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, BookOpen, Clock, ShieldAlert, Pencil, Copy, Archive
} from "lucide-react";
import { getPlaybooksForMarketplaceAction } from "@/app/actions/business-plan-actions";
import { useTenant } from "@/lib/tenant-context";
import { PlaybookPreviewModal } from "./PlaybookPreviewModal";

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'INACTIVE';

export const PlaybookMarketplaceApp: React.FC = () => {
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const orgId = currentTenant?.tenant_id ?? '';
  const router = useRouter();
  const pathname = usePathname();
  // Extract locale prefix (e.g. '/en') from current pathname
  const localePrefix = pathname.split('/')[1] ? `/${pathname.split('/')[1]}` : '';

  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>("ALL");

  const [selectedPlaybook, setSelectedPlaybook] = useState<any | null>(null);

  const fetchPlaybooks = async (statusFilter: StatusFilter) => {
    if (!orgId) return;
    setLoading(true);
    const statusArr =
      statusFilter === "ALL"
        ? ["DRAFT", "PUBLISHED", "INACTIVE"]
        : [statusFilter];
    const data = await getPlaybooksForMarketplaceAction(orgId, statusArr);
    setPlaybooks(data);
    setLoading(false);
  };

  useEffect(() => {
    // Wait for tenant to finish loading before fetching
    if (tenantLoading || !orgId) return;
    fetchPlaybooks(activeStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, activeStatusFilter, tenantLoading]);

  const filteredPlaybooks = playbooks.filter((pb) => {
    const term = search.toLowerCase();
    const matchSearch =
      pb.name?.toLowerCase().includes(term) ||
      pb.purpose?.toLowerCase().includes(term);
    const matchType = typeFilter ? pb.type === typeFilter : true;
    const matchFamily = familyFilter ? pb.family === familyFilter : true;
    const matchStrategy = strategyFilter ? pb.strategy === strategyFilter : true;
    return matchSearch && matchType && matchFamily && matchStrategy;
  });

  const handleEdit = (e: React.MouseEvent, pb: any) => {
    e.stopPropagation();
    router.push(`${localePrefix}/business-plan/playbook-designer?id=${pb.id}`);
  };

  const handleDuplicate = (e: React.MouseEvent, pb: any) => {
    e.stopPropagation();
    router.push(`${localePrefix}/business-plan/playbook-designer?duplicate=${pb.id}`);
  };

  const handleCardClick = (pb: any) => {
    if (pb.status === "DRAFT") {
      // Draft cards redirect directly to Designer for editing
      router.push(`${localePrefix}/business-plan/playbook-designer?id=${pb.id}`);
    } else {
      setSelectedPlaybook(pb);
    }
  };

  const STATUS_FILTERS: { label: string; value: StatusFilter; color: string }[] = [
    { label: "All", value: "ALL", color: "bg-slate-800 text-white" },
    { label: "Active", value: "PUBLISHED", color: "bg-emerald-600 text-white" },
    { label: "Draft", value: "DRAFT", color: "bg-amber-500 text-white" },
    { label: "Inactive", value: "INACTIVE", color: "bg-slate-400 text-white" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-8 shrink-0 relative overflow-hidden">
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
          Explore, edit, duplicate, and assign institutional playbooks for your operational and commercial teams.
        </p>

        {/* Status Filter Chips */}
        <div className="mt-5 flex gap-2 relative z-10">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                activeStatusFilter === f.value
                  ? f.color + " shadow-md scale-105"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Filters Toolbar */}
        <div className="mt-5 flex flex-wrap gap-4 items-center relative z-10">
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
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cobalt-blue)]" />
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
                onClick={() => handleCardClick(pb)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all p-6 group cursor-pointer active:scale-[0.98] flex flex-col relative overflow-hidden"
              >
                {/* Status + Version badge row */}
                <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <TypeBadge type={pb.type} />
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600">
                      {pb.family}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 text-slate-500">
                      {pb.strategy}
                    </span>
                  </div>
                  <StatusBadge status={pb.status} version={pb.version} />
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
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {pb.bp_playbook_steps?.length || 0} STEPS
                    </span>
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleEdit(e, pb)}
                      title="Edit this playbook"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, pb)}
                      title="Duplicate this playbook"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Copy size={13} />
                    </button>
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
          onRefresh={() => fetchPlaybooks(activeStatusFilter)}
        />
      )}
    </div>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: string }) => {
  let styles = "bg-slate-100 text-slate-600";
  if (type === "CORE") styles = "bg-[#002B5B] text-white";
  else if (type === "GROWTH") styles = "bg-[#0056C0] text-white";
  else if (type === "ELITE") styles = "bg-indigo-600 text-white";
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${styles}`}>
      {type}
    </span>
  );
};

const StatusBadge = ({ status, version }: { status: string; version?: number }) => {
  if (status === "PUBLISHED") {
    return (
      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
        ACTIVE {version && version > 1 ? `v${version}` : ""}
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 flex items-center gap-1">
        <Pencil size={8} /> DRAFT
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 flex items-center gap-1">
      <Archive size={8} /> INACTIVE
    </span>
  );
};
