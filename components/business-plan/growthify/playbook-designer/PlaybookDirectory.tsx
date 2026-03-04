"use client";

import { useEffect, useState } from "react";
import { getPlaybooks } from "@/lib/actions/playbook/directory";
import { togglePlaybookActiveStatus } from "@/lib/actions/playbook/directory";
import { useTenant } from "@/lib/tenant-context";
import { Plus, Search, CheckCircle2, CircleDashed, FileEdit, Archive, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

type PlaybookEntry = {
    id: string;
    name: string;
    version: number;
    playbook_type: string;
    status: string;
    is_active: boolean;
    updated_at: string;
    author_id: string;
    dim_employee: {
        first_name: string;
        last_name: string;
    };
};

type View = "directory" | "editor" | "visualizer";

interface Props {
    onNavigate: (view: View, playbookId?: string) => void;
}

export function PlaybookDirectory({ onNavigate }: Props) {
    const { currentTenant } = useTenant();
    const [playbooks, setPlaybooks] = useState<PlaybookEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("All");

    useEffect(() => {
        if (!currentTenant?.tenant_id) return;
        setIsLoading(true);
        getPlaybooks(currentTenant.tenant_id).then(({ data }) => {
            setPlaybooks((data as unknown as PlaybookEntry[]) || []);
            setIsLoading(false);
        });
    }, [currentTenant?.tenant_id]);

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        if (confirm(`Are you sure you want to ${currentStatus ? "Deactivate" : "Activate"} this Playbook?`)) {
            const res = await togglePlaybookActiveStatus(id, !currentStatus);
            if (res.success) {
                setPlaybooks((prev) => prev.map((pb) => pb.id === id ? { ...pb, is_active: !currentStatus } : pb));
            }
        }
    };

    const filteredPlaybooks = playbooks.filter((pb) => {
        const matchesSearch = pb.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === "All" || pb.playbook_type === filterType;
        return matchesSearch && matchesType;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Approved": return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
            case "Submitted": return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-800 ring-1 ring-inset ring-yellow-600/20"><CircleDashed className="h-3 w-3" /> Submitted</span>;
            case "Draft": return <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-500/10"><FileEdit className="h-3 w-3" /> Draft</span>;
            default: return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{status}</span>;
        }
    };

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-7xl space-y-6">

                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#002B5B]">Playbook Directory</h1>
                            <p className="text-sm text-gray-500">Master Repository of tactical execution models.</p>
                        </div>
                        <button
                            onClick={() => onNavigate("editor", "new")}
                            className="flex flex-none items-center gap-2 rounded-md bg-[#002B5B] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Playbook</span>
                        </button>
                    </div>

                    {/* Table Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        {/* Controls */}
                        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="relative max-w-sm flex-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#002B5B] sm:text-sm"
                                    placeholder="Search playbooks..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <select
                                className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-[#002B5B] sm:text-sm"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="All">All Types</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Operations">Operations</option>
                                <option value="Special">Special</option>
                            </select>
                        </div>

                        {/* Grid */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-[#002B5B]" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Playbook Name</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Version</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Author</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Updated</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">State</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredPlaybooks.length > 0 ? filteredPlaybooks.map((pb) => (
                                            <tr key={pb.id} className="hover:bg-gray-50/50">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{pb.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{pb.playbook_type}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">v{pb.version.toString().padStart(3, "0")}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{pb.dim_employee?.first_name} {pb.dim_employee?.last_name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{format(new Date(pb.updated_at), "PP")}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getStatusBadge(pb.status)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {pb.is_active
                                                        ? <span className="inline-flex items-center text-xs font-medium text-emerald-600">Active</span>
                                                        : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><Archive className="h-3 w-3" /> Archived</span>
                                                    }
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => onNavigate("editor", pb.id)} className="text-[#002B5B] hover:text-blue-900" title="Edit">
                                                            <FileEdit className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => onNavigate("visualizer", pb.id)} className="text-gray-400 hover:text-gray-600" title="Visualize">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => handleToggleActive(pb.id, pb.is_active)} className="text-gray-400 hover:text-red-600" title={pb.is_active ? "Archive" : "Activate"}>
                                                            <Archive className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                                                    {!currentTenant ? "Please select a Tenant to view Playbooks." : "No Playbooks found matching your criteria."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
