"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    MapPin, Building2, Plus, Edit2, Trash2, X, Check,
    AlertCircle, Globe, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalLegalEntity } from "@/lib/hr-types";
import {
    getLocalLegalEntitiesAction,
    saveLocalLegalEntityAction,
    deleteLocalLegalEntityAction
} from "@/app/actions/legal-entity-actions";

// ─── Form Component ───────────────────────────────────────────────────────────

interface EntityFormProps {
    entity: Partial<LocalLegalEntity> | null;
    onClose: () => void;
    onSaved: () => void;
}

const EntityForm: React.FC<EntityFormProps> = ({ entity, onClose, onSaved }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<LocalLegalEntity>>({
        entity_name: "",
        local_tax_id: "",
        local_ein: "",
        entity_country: "Colombia",
        is_active: true,
        ...entity
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.entity_name?.trim()) {
            setError("Entity name is required");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await saveLocalLegalEntityAction(formData as LocalLegalEntity);
            onSaved();
        } catch (err: any) {
            setError(err.message || "Failed to save entity");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-bold text-navy-blue flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cobalt-blue" />
                    {entity?.id ? "Edit Legal Entity" : "New Legal Entity"}
                </h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Entity Name */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Entity Name (Legal Name)</label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            placeholder="e.g. HOMESI SAS"
                            value={formData.entity_name}
                            onChange={e => setFormData(p => ({ ...p, entity_name: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Tax ID */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Local Tax ID (NIT)</label>
                        <input
                            type="text"
                            placeholder="e.g. 900.123.456-1"
                            value={formData.local_tax_id || ""}
                            onChange={e => setFormData(p => ({ ...p, local_tax_id: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                        />
                    </div>

                    {/* EIN */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Local EIN / Registry</label>
                        <input
                            type="text"
                            placeholder="Registry number"
                            value={formData.local_ein || ""}
                            onChange={e => setFormData(p => ({ ...p, local_ein: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                        />
                    </div>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Country</label>
                    <select
                        value={formData.entity_country}
                        onChange={e => setFormData(p => ({ ...p, entity_country: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all bg-white"
                    >
                        <option value="Colombia">Colombia</option>
                        <option value="United States">United States</option>
                        <option value="European Union">European Union</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Panama">Panama</option>
                    </select>
                </div>

                {/* Integration Info */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        <strong>Architect's Note:</strong> The Entity Name must exactly match the value used in <strong>Employee Intake</strong> if you are mapping existing records.
                        Updating the name here will update the dropdown options across the entire system instantly.
                    </p>
                </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-xl shadow-lg shadow-navy-blue/10 transition-all disabled:opacity-50"
                >
                    {loading ? "Saving..." : <><Check className="w-4 h-4" /> Save Entity</>}
                </button>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LegalEntityApp: React.FC = () => {
    const [entities, setEntities] = useState<LocalLegalEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<LocalLegalEntity | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await getLocalLegalEntitiesAction();
        setEntities(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleEdit = (entity: LocalLegalEntity) => {
        setEditingEntity(entity);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this entity? It will be marked as inactive and removed from dropdowns.")) return;
        try {
            await deleteLocalLegalEntityAction(id);
            load();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleSaved = () => {
        setIsFormOpen(false);
        setEditingEntity(null);
        load();
    };

    const filtered = entities.filter(e =>
        e.entity_name.toLowerCase().includes(search.toLowerCase()) ||
        e.entity_country.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-full bg-white relative overflow-hidden">
            {/* Main List */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or country..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-cobalt-blue/20 outline-none focus:border-cobalt-blue transition-all"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingEntity(null); setIsFormOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-xl transition-all shadow-md shadow-navy-blue/10"
                    >
                        <Plus className="w-3.5 h-3.5" /> New Entity
                    </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-slate-400 h-full animate-pulse">
                            <Building2 className="w-8 h-8 animate-bounce mb-2" />
                            <p className="text-sm font-medium ml-2">Loading legal entities...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 z-10">
                                <tr>
                                    {["Legal Entity Name", "Tax ID (NIT)", "EIN / Registry", "Country", "Actions"].map(h => (
                                        <th key={h} className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(entity => (
                                    <tr key={entity.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-cobalt-blue/5 flex items-center justify-center text-cobalt-blue shrink-0 group-hover:bg-cobalt-blue/10 transition-colors">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-navy-blue">{entity.entity_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                            {entity.local_tax_id || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {entity.local_ein || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                <Globe className="w-3.5 h-3.5 text-slate-300" />
                                                {entity.entity_country}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(entity)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-cobalt-blue hover:bg-cobalt-blue/8 transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entity.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-action-red hover:bg-action-red/8 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <p className="text-sm text-slate-400">No entities found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 uppercase tracking-wider font-semibold">
                        <MapPin className="w-3 h-3" />
                        Managing {entities.length} active legal entities for SIMO Intellisense
                    </p>
                </div>
            </div>

            {/* Side Drawer for Form */}
            {isFormOpen && (
                <div className="absolute inset-0 z-20 flex justify-end">
                    <div className="absolute inset-0 bg-navy-blue/10 backdrop-blur-[2px]" onClick={() => setIsFormOpen(false)} />
                    <div className="relative w-full max-w-md bg-white shadow-2xl animate-slideInRight h-full border-l border-slate-100">
                        <EntityForm
                            entity={editingEntity}
                            onClose={() => setIsFormOpen(false)}
                            onSaved={handleSaved}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
