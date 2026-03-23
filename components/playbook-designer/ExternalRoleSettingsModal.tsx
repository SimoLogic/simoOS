"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, ToggleLeft, ToggleRight, Search, ShieldAlert } from 'lucide-react';
import { useTenant } from '@/lib/tenant-context';
import { 
  getActiveExternalRolesAction, 
  createExternalRoleAction, 
  toggleExternalRoleStatusAction,
  ExternalRoleInput 
} from '@/app/actions/business-plan-actions';

interface ExternalRole {
  id: string;
  name: string;
  status: string;
  business_type: string | null;
  size: string | null;
  annual_volume: string | null;
  num_agents: string | null;
  notes: string | null;
}

interface ExternalRoleSettingsModalProps {
  onClose: () => void;
  onUpdate: () => void; // Trigger parent refresh
}

export const ExternalRoleSettingsModal: React.FC<ExternalRoleSettingsModalProps> = ({ onClose, onUpdate }) => {
  const { currentTenant } = useTenant();
  const orgId = currentTenant?.tenant_id ?? '';

  const [roles, setRoles] = useState<ExternalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [size, setSize] = useState<'Small' | 'Mid' | 'Large' | ''>('');
  const [annualVolume, setAnnualVolume] = useState('');
  const [numAgents, setNumAgents] = useState('');
  const [notes, setNotes] = useState('');

  const annualVolumeOptions = [
    'Under 2MM', '2MM-4MM', '4MM-6MM', '6MM-10MM', '10MM-20MM', '20MM-40MM', '40MM-80MM', '80MM+'
  ];
  const numAgentsOptions = [
    '1-5', '6-10', '11-20', '21-35', '36-50', '51-100', '100+'
  ];

  const fetchRoles = async () => {
    if (!orgId) return;
    setLoading(true);
    const data = await getActiveExternalRolesAction(orgId);
    setRoles(data as ExternalRole[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    if (!name.trim()) {
      setErrorText('Name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorText('');

    const payload: ExternalRoleInput = {
      name: name.trim(),
      businessType: businessType.trim(),
      size: size || undefined,
      annualVolume: annualVolume || undefined,
      numAgents: numAgents || undefined,
      notes: notes.trim(),
    };

    const res = await createExternalRoleAction(orgId, payload);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorText(res.error || 'Failed to create role');
    } else {
      // Reset form
      setName('');
      setBusinessType('');
      setSize('');
      setAnnualVolume('');
      setNumAgents('');
      setNotes('');
      // Refresh Lists
      await fetchRoles();
      onUpdate();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!orgId) return;
    const res = await toggleExternalRoleStatusAction(orgId, id, currentStatus);
    if (!res.success) {
      alert(res.error || 'Failed to toggle status');
    } else {
      await fetchRoles();
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex h-[85vh] overflow-hidden flex-col md:flex-row relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* LEFT PANEL: Form */}
        <div className="w-full md:w-[400px] bg-slate-50 border-r border-slate-200 p-8 flex flex-col items-center justify-center shrink-0 overflow-y-auto pb-scrollbar">
          <div className="w-full max-w-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">
              External Role Setup
            </h2>
            <p className="text-xs text-slate-500 mb-8">
              Create standardized external stakeholders to be used across playbooks.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Role Name *</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Realtor, Broker"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Business Type</label>
                <input 
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. B2B, Commercial"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Size</label>
                  <select 
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Select...</option>
                    <option value="Small">Small</option>
                    <option value="Mid">Mid</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Agents</label>
                  <select 
                    value={numAgents}
                    onChange={(e) => setNumAgents(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Select...</option>
                    {numAgentsOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Annual Volume</label>
                <select 
                  value={annualVolume}
                  onChange={(e) => setAnnualVolume(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                >
                  <option value="">Select Tier...</option>
                  {annualVolumeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  placeholder="Additional context..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none h-20"
                />
              </div>

              {errorText && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                  <ShieldAlert size={14} /> {errorText}
                </div>
              )}

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'CREATING...' : <><Plus size={16} /> ADD EXTERNAL ROLE</>}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: List */}
        <div className="flex-1 p-8 flex flex-col bg-white overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Directory</h3>
              <p className="text-xs text-slate-500">Manage existing external roles</p>
            </div>
            <div className="relative text-slate-800 w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-300 transition-all"
                placeholder="Search roles..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 pb-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400 font-medium animate-pulse">
                Loading directory...
              </div>
            ) : roles.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 italic">
                No external roles created yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {roles.map(role => (
                  <div key={role.id} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-black text-slate-800 truncate">{role.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${role.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {role.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {role.business_type && <span><span className="font-semibold text-slate-400">TYPE:</span> {role.business_type}</span>}
                        {role.size && <span><span className="font-semibold text-slate-400">SIZE:</span> {role.size}</span>}
                        {role.annual_volume && <span><span className="font-semibold text-slate-400">VOL:</span> {role.annual_volume}</span>}
                        {role.num_agents && <span><span className="font-semibold text-slate-400">AGENTS:</span> {role.num_agents}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleStatus(role.id, role.status)}
                      className={`shrink-0 p-2 rounded-full transition-colors flex items-center justify-center ${role.status === 'Active' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
                      title={`Click to ${role.status === 'Active' ? 'Deactivate' : 'Activate'}`}
                    >
                      {role.status === 'Active' ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
