"use client";

import { useState } from "react";
import { Plus, Trash2, Settings, Users, BookOpen, Database, ActivitySquare, CheckCircle } from "lucide-react";
import { addExternalRole, removeExternalRole, addPlaybookDesigner, removePlaybookDesigner } from "@/lib/actions/playbook/setup";

type Role = {
    id: string;
    role_name: string;
    description: string;
};

type Designer = {
    id: string;
    employee_id: string;
    dim_employee: {
        first_name: string;
        last_name: string;
        work_email: string;
        job_title: string;
    };
};

export function SetupClient({ initialDesigners, initialExternalRoles, tenantId }: { initialDesigners: Designer[], initialExternalRoles: Role[], tenantId: string }) {
    const [designers, setDesigners] = useState<Designer[]>(initialDesigners);
    const [roles, setRoles] = useState<Role[]>(initialExternalRoles);

    // Add Role Form State
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [isAddingRole, setIsAddingRole] = useState(false);

    // Add Designer Form State (Mocked input for this demo, in real life a multi-select from HC Master)
    const [newEid, setNewEid] = useState("");
    const [isAddingDesigner, setIsAddingDesigner] = useState(false);

    // Sub-navigation
    const [activeTab, setActiveTab] = useState<"roles" | "pool" | "data" | "approvers">("roles");


    const handleCreateRole = async () => {
        if (!newRoleName || !newRoleDesc) return;
        setIsAddingRole(true);
        const res = await addExternalRole(tenantId, newRoleName, newRoleDesc);
        if (res.success && res.data) {
            setRoles([res.data as Role, ...roles]);
            setNewRoleName("");
            setNewRoleDesc("");
        }
        setIsAddingRole(false);
    };

    const handleDeleteRole = async (id: string) => {
        if (confirm("Borrando un rol externo. ¿Deseas continuar?")) {
            const res = await removeExternalRole(id);
            if (res.success) setRoles(roles.filter(r => r.id !== id));
        }
    };

    const handleAddDesigner = async () => {
        if (!newEid) return;
        setIsAddingDesigner(true);
        const res = await addPlaybookDesigner(tenantId, newEid);
        // In a real flow, this would return the full hydrated dim_employee join. 
        // We will refresh the page or mutate in a fully robust app.
        if (res.success) {
            alert("Added successfully! (Please refresh to see the expanded name)");
            setNewEid("");
        }
        setIsAddingDesigner(false);
    };

    const handleDeleteDesigner = async (id: string) => {
        if (confirm("Removiendo permisos de diseño para este empleado. ¿Deseas continuar?")) {
            const res = await removePlaybookDesigner(id);
            if (res.success) setDesigners(designers.filter(d => d.id !== id));
        }
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Setup Tabs */}
            <div className="flex gap-4 border-b border-gray-200 px-2">
                <button onClick={() => setActiveTab("roles")} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "roles" ? "border-b-2 border-[#002B5B] text-[#002B5B]" : "text-gray-500 hover:text-gray-700"}`}>
                    Designers & External Roles
                </button>
                <button onClick={() => setActiveTab("pool")} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "pool" ? "border-b-2 border-[#002B5B] text-[#002B5B]" : "text-gray-500 hover:text-gray-700"}`}>
                    Activity Dictionary Pool
                </button>
                <button onClick={() => setActiveTab("data")} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "data" ? "border-b-2 border-[#002B5B] text-[#002B5B]" : "text-gray-500 hover:text-gray-700"}`}>
                    Data Sources & integrations
                </button>
                <button onClick={() => setActiveTab("approvers")} className={`pb-3 text-sm font-semibold transition-colors ${activeTab === "approvers" ? "border-b-2 border-[#002B5B] text-[#002B5B]" : "text-gray-500 hover:text-gray-700"}`}>
                    Global Approvers
                </button>
            </div>

            {/* TAB: ROLES & DESIGNERS */}
            {activeTab === "roles" && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Playbook Designers Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#002B5B]" />
                                <h2 className="text-lg font-semibold text-gray-900">Playbook Designers</h2>
                            </div>
                        </div>
                        <p className="mb-6 text-sm text-gray-500">
                            Employees enabled to create, edit, and submit playbooks for approval.
                        </p>

                        <div className="mb-6 flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter EID (e.g., EMP001)"
                                className="flex-1 rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                                value={newEid}
                                onChange={(e) => setNewEid(e.target.value)}
                            />
                            <button
                                disabled={isAddingDesigner}
                                onClick={handleAddDesigner}
                                className="flex items-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm text-white transition-colors hover:bg-blue-900 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        </div>

                        <div className="space-y-3">
                            {designers.map((d) => (
                                <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <div>
                                        <p className="font-medium text-gray-900">{d.dim_employee?.first_name} {d.dim_employee?.last_name}</p>
                                        <p className="text-xs text-gray-500">{d.dim_employee?.job_title} • {d.employee_id}</p>
                                    </div>
                                    <button onClick={() => handleDeleteDesigner(d.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {designers.length === 0 && (
                                <div className="py-4 text-center text-sm text-gray-500">No designers configured yet.</div>
                            )}
                        </div>
                    </div>

                    {/* External Roles Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-[#002B5B]" />
                                <h2 className="text-lg font-semibold text-gray-900">External Roles & Participants</h2>
                            </div>
                        </div>
                        <p className="mb-6 text-sm text-gray-500">
                            Define external agents (e.g., Realtors, Brokers) that can be assigned as Owners or Stakeholders in Playbook Steps.
                        </p>

                        <div className="mb-6 space-y-3">
                            <input
                                type="text"
                                placeholder="Role Name (e.g., Realtor)"
                                className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                            />
                            <textarea
                                placeholder="Description..."
                                className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                                rows={2}
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                            />
                            <button
                                disabled={isAddingRole}
                                onClick={handleCreateRole}
                                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm text-white transition-colors hover:bg-blue-900 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" /> Create External Role
                            </button>
                        </div>

                        <div className="max-h-64 space-y-3 overflow-y-auto">
                            {roles.map((r) => (
                                <div key={r.id} className="group relative flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-gray-300">
                                    <div>
                                        <p className="font-semibold text-gray-900">{r.role_name}</p>
                                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{r.description}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteRole(r.id)}
                                        className="ml-2 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {roles.length === 0 && (
                                <div className="py-4 text-center text-sm text-gray-500">No external roles configured yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ACTIVITY POOL */}
            {activeTab === "pool" && (
                <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <ActivitySquare className="h-6 w-6 text-[#002B5B]" />
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Activity Dictionary Pool</h2>
                                <p className="text-sm text-gray-500">Standardize the actions executioners take across all Playbooks.</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-900">
                            <Plus className="h-4 w-4" /> New Activity
                        </button>
                    </div>
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500 border-2 border-dashed border-gray-100 rounded-xl">
                        Activity Categories and Dictionary Matrix will load here (Awaiting Server Action integration).
                    </div>
                </div>
            )}

            {/* TAB: DATA SOURCES */}
            {activeTab === "data" && (
                <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <Database className="h-6 w-6 text-[#002B5B]" />
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Systems & Data Sources</h2>
                                <p className="text-sm text-gray-500">Sources of truth for KPI evaluation (Encompass, Salesforce, BI).</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-900">
                            <Plus className="h-4 w-4" /> Add Source
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="font-semibold text-gray-800">Encompass LOS</span>
                        </div>
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="font-semibold text-gray-800">Salesforce CRM</span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: APPROVERS */}
            {activeTab === "approvers" && (
                <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-6 w-6 text-[#002B5B]" />
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Global Playbook Approvers</h2>
                                <p className="text-sm text-gray-500">Define the default C-Level or VP executives required to authorize playbook publications.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6 max-w-lg">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Level 1 Approver (Operations)</label>
                            <select className="mt-1 w-full rounded border p-2 text-sm focus:border-blue-500">
                                <option>Select VP of Operations...</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Level 2 Approver (Growth)</label>
                            <select className="mt-1 w-full rounded border p-2 text-sm focus:border-blue-500">
                                <option>Select Chief Growth Officer...</option>
                            </select>
                        </div>
                        <button className="w-full rounded bg-[#002B5B] py-2 text-sm font-bold text-white hover:bg-blue-900">
                            Save Default Approvers
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
