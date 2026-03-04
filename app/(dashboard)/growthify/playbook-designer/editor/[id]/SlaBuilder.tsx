"use client";

import { usePlaybookEditorStore } from "@/lib/store/playbook-editor-store";
import { Plus, Trash2, Activity, Database, AlertTriangle } from "lucide-react";

export function SlaBuilder({ dictionaries }: { dictionaries: any }) {
    const store = usePlaybookEditorStore();

    const handleAddSla = () => {
        store.addSla({
            id: crypto.randomUUID(),
            kpi_name: "",
            kpi_mnemonic_id: "",
            description: "",
            data_source_id: null,
            frequency: "Monthly",
            formula_definition: "",
            threshold_operator: ">",
            threshold_value: ""
        });
    };

    return (
        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-[#002B5B] flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        SLAs & KPIs
                    </h2>
                    <p className="text-sm text-gray-500">Define expected performance metrics for this Playbook.</p>
                </div>
                <button
                    onClick={handleAddSla}
                    className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-[#002B5B] hover:bg-blue-100"
                >
                    <Plus className="h-4 w-4" />
                    Add Metric
                </button>
            </div>

            <div className="space-y-4">
                {store.slas.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center text-gray-500">
                        No SLAs defined yet. Add a metric to track success.
                    </div>
                ) : (
                    store.slas.map((sla) => (
                        <div key={sla.id} className="relative rounded-lg border border-gray-100 bg-gray-50 p-5">
                            <button
                                onClick={() => store.removeSla(sla.id)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-red-600"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 pr-8">
                                <div className="col-span-1 lg:col-span-1 border-r border-gray-200 pr-4">
                                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Metric Setup</label>
                                    <input
                                        type="text"
                                        placeholder="KPI Name (e.g. Conversion Rate)"
                                        value={sla.kpi_name}
                                        onChange={(e) => store.updateSla(sla.id, { kpi_name: e.target.value })}
                                        className="mb-2 w-full rounded border p-2 text-sm outline-none focus:border-[#002B5B]"
                                    />
                                    <textarea
                                        placeholder="KPI Description..."
                                        rows={2}
                                        value={sla.description}
                                        onChange={(e) => store.updateSla(sla.id, { description: e.target.value })}
                                        className="w-full rounded border p-2 text-xs outline-none focus:border-[#002B5B]"
                                    />
                                </div>

                                <div className="col-span-1 lg:col-span-1 border-r border-gray-200 pr-4">
                                    <label className="mb-1 block flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                                        <Database className="h-3 w-3" /> Data Source
                                    </label>
                                    <select
                                        value={sla.data_source_id || ''}
                                        onChange={(e) => store.updateSla(sla.id, { data_source_id: e.target.value })}
                                        className="mb-2 w-full rounded border p-2 text-sm outline-none focus:border-[#002B5B]"
                                    >
                                        <option value="">Select Source...</option>
                                        {dictionaries.dataSources?.map((ds: any) => (
                                            <option key={ds.id} value={ds.id}>{ds.source_name}</option>
                                        ))}
                                    </select>

                                    <label className="mb-1 mt-3 block text-[10px] font-semibold uppercase text-gray-500">Frequency</label>
                                    <select
                                        value={sla.frequency}
                                        onChange={(e) => store.updateSla(sla.id, { frequency: e.target.value })}
                                        className="w-full rounded border p-2 text-xs outline-none focus:border-[#002B5B]"
                                    >
                                        <option>Daily</option>
                                        <option>Weekly</option>
                                        <option>Monthly</option>
                                        <option>Quarterly</option>
                                    </select>
                                </div>

                                <div className="col-span-1 lg:col-span-2">
                                    <label className="mb-1 flex items-center gap-1 block text-xs font-semibold uppercase text-[#002B5B]">
                                        <AlertTriangle className="h-3 w-3" /> Threshold Logic
                                    </label>
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-1">
                                            <p className="mb-1 text-[10px] text-gray-500">Formula Definition</p>
                                            <input
                                                type="text"
                                                placeholder="(Total A / Total B) * 100"
                                                value={sla.formula_definition}
                                                onChange={(e) => store.updateSla(sla.id, { formula_definition: e.target.value })}
                                                className="w-full font-mono rounded border p-2 text-sm text-[#002B5B] outline-none focus:border-[#002B5B] bg-white ring-1 ring-inset ring-gray-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <p className="mb-1 text-[10px] text-gray-500">Condition</p>
                                            <select
                                                value={sla.threshold_operator}
                                                onChange={(e) => store.updateSla(sla.id, { threshold_operator: e.target.value })}
                                                className="w-full rounded border p-2 text-sm font-mono text-center outline-none focus:border-[#002B5B]"
                                            >
                                                <option>&gt;</option>
                                                <option>&lt;</option>
                                                <option>=</option>
                                                <option>&gt;=</option>
                                                <option>&lt;=</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <p className="mb-1 text-[10px] text-gray-500">Expected Value</p>
                                            <input
                                                type="text"
                                                placeholder="e.g. 85%"
                                                value={sla.threshold_value}
                                                onChange={(e) => store.updateSla(sla.id, { threshold_value: e.target.value })}
                                                className="w-full rounded border p-2 text-sm outline-none focus:border-[#002B5B]"
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
