"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Users, Banknote, UserPlus, UserMinus, Activity,
    TrendingDown, Download, Filter, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { useTenant } from "@/lib/tenant-context";
import { getEmployees } from "@/lib/hr-store";
import { FullEmployeeRecord } from "@/lib/hr-types";

// ─── Constants & Types ────────────────────────────────────────────────────────

const COLORS = ['#002B5B', '#0047AB', '#007FFF', '#4169E1', '#6495ED', '#87CEEB'];
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface ChartSegmentData {
    name: string;
    value: number;
    employees: FullEmployeeRecord[];
}

// ─── Deep Dive Modal ────────────────────────────────────────────────────────

const DeepDiveModal: React.FC<{
    title: string;
    data: FullEmployeeRecord[];
    onClose: () => void;
}> = ({ title, data, onClose }) => {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 bg-navy-blue text-white shrink-0">
                    <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cobalt-blue" />
                            Segment Deep Dive: {title}
                        </h3>
                        <p className="text-xs text-white/70 mt-1">{data.length} employees</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors">✕</button>
                </div>
                <div className="p-6 overflow-auto flex-1 bg-slate-50/50">
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Area</th>
                                    <th className="px-4 py-3">Position</th>
                                    <th className="px-4 py-3 text-right">Base Salary</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map(emp => (
                                    <tr key={emp.eid} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3 font-medium text-navy-blue">
                                            {emp.maestro.primer_nombre} {emp.maestro.primer_apellido}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs font-mono">{emp.maestro.numero_identificacion}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{emp.historialLaboral.area}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{emp.historialLaboral.job_title || "N/A"}</td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-600 text-xs font-semibold">
                                            ${(emp.historialLaboral.salario_base || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                emp.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
                <p className="text-sm font-bold text-navy-blue mb-1">{label || payload[0].name}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex flex-col gap-0.5">
                            <p className="text-xs font-medium" style={{ color: entry.color }}>
                                {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
                            </p>
                            {entry.payload && entry.payload.employees && (
                                <p className="text-[10px] text-slate-400 italic">Double-click bar to see {entry.payload.employees.length} employees</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const HRMetricsDashboard: React.FC = () => {
    const { currentTenant } = useTenant();
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterArea, setFilterArea] = useState<string>("All");
    const [filterStatus, setFilterStatus] = useState<string>("Active");

    // Modal State
    const [deepDiveData, setDeepDiveData] = useState<{ title: string; data: FullEmployeeRecord[] } | null>(null);

    const tenantCode = currentTenant?.tenant_id || "";

    const loadData = async () => {
        if (!tenantCode) return;
        setLoading(true);
        try {
            const data = await getEmployees(tenantCode);
            setEmployees(data);
        } catch (error) {
            console.error("Failed to load HR metrics data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantCode]);

    // ─── Data Processing & Filtering ────────────────────────────────────────

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            if (filterStatus !== "All" && emp.status !== filterStatus) return false;
            if (filterArea !== "All" && emp.historialLaboral.area !== filterArea) return false;
            return true;
        });
    }, [employees, filterArea, filterStatus]);

    // KPIs Calculation
    const kpis = useMemo(() => {
        const activeEmp = employees.filter(e => e.status === "Active");
        const inactiveEmp = employees.filter(e => e.status !== "Active");

        const totalActive = activeEmp.length;
        const rosterValue = activeEmp.reduce((sum, emp) => sum + (Number(emp.historialLaboral.salario_base) || 0), 0);

        // Current Month calc (simplistic approach for demo)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const newHires = activeEmp.filter(e => {
            const d = new Date(e.historialLaboral.fecha_inicio || "");
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;

        const attritionCount = inactiveEmp.filter(e => {
            const d = new Date(e.historialLaboral.fecha_fin || "");
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;

        const attritionRate = totalActive > 0 ? ((attritionCount / (totalActive + attritionCount)) * 100).toFixed(1) : "0.0";

        return { totalActive, rosterValue, newHires, attritionCount, attritionRate };
    }, [employees]);

    // Chart: Headcount by Area
    const hcByArea = useMemo(() => {
        const counts: Record<string, { name: string, value: number, employees: FullEmployeeRecord[] }> = {};
        filteredEmployees.forEach(emp => {
            const area = emp.historialLaboral.area || "Unassigned";
            if (!counts[area]) {
                counts[area] = { name: area, value: 0, employees: [] };
            }
            counts[area].value += 1;
            counts[area].employees.push(emp);
        });
        return Object.values(counts).sort((a, b) => b.value - a.value);
    }, [filteredEmployees]);

    // Chart: Salary by Area
    const salaryByArea = useMemo(() => {
        const costs: Record<string, { name: string, value: number, employees: FullEmployeeRecord[] }> = {};
        filteredEmployees.forEach(emp => {
            const area = emp.historialLaboral.area || "Unassigned";
            const salary = Number(emp.historialLaboral.salario_base) || 0;
            if (!costs[area]) {
                costs[area] = { name: area, value: 0, employees: [] };
            }
            costs[area].value += salary;
            costs[area].employees.push(emp);
        });
        return Object.values(costs).sort((a, b) => b.value - a.value);
    }, [filteredEmployees]);

    // Chart: Ops vs Non-Ops
    const opsDistribution = useMemo(() => {
        let ops = { name: "Operations", value: 0, employees: [] as FullEmployeeRecord[] };
        let nonOps = { name: "Non-Operations", value: 0, employees: [] as FullEmployeeRecord[] };

        filteredEmployees.forEach(emp => {
            const area = emp.historialLaboral.area?.toLowerCase() || "";
            if (area.includes("operation") || area.includes("operaciones") || area.includes("sales")) {
                ops.value += 1;
                ops.employees.push(emp);
            } else {
                nonOps.value += 1;
                nonOps.employees.push(emp);
            }
        });

        return [ops, nonOps].filter(item => item.value > 0);
    }, [filteredEmployees]);

    const uniqueAreas = useMemo(() => {
        const areas = new Set(employees.map(e => e.historialLaboral.area).filter(Boolean));
        return ["All", ...Array.from(areas)];
    }, [employees]);

    // ─── Render Helpers ─────────────────────────────────────────────────────

    const handleChartDoubleClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const segment = data.activePayload[0].payload;
            if (segment.employees && segment.employees.length > 0) {
                setDeepDiveData({
                    title: segment.name,
                    data: segment.employees
                });
            }
        }
    };

    const handlePieDoubleClick = (data: any) => {
        if (data && data.payload && data.payload.employees) {
            setDeepDiveData({
                title: data.name,
                data: data.payload.employees
            });
        }
    };

    if (!currentTenant) {
        return <div className="p-8 text-center text-slate-500">Please select a tenant.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 overflow-auto">
            {/* Header & Filters */}
            <div className="px-8 py-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-navy-blue tracking-tight">HR Metrics & Analytics</h2>
                    <p className="text-sm text-slate-500 mt-1">Real-time HC Master Data Insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 py-1.5 focus:ring-0 cursor-pointer"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active Only</option>
                            <option value="Inactive">Inactive Only</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <select
                            value={filterArea}
                            onChange={(e) => setFilterArea(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 py-1.5 focus:ring-0 cursor-pointer max-w-[150px]"
                        >
                            {uniqueAreas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-cobalt-blue")} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cobalt-blue text-white text-sm font-bold rounded-lg hover:bg-navy-blue transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {/* KPIs Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-cobalt-blue/30 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-cobalt-blue/10 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-cobalt-blue" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active</p>
                            <p className="text-2xl font-black text-navy-blue mt-1">{loading ? "—" : kpis.totalActive}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <Banknote className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Roster Value (COP)</p>
                            <p className="text-xl font-black text-emerald-700 mt-1 font-mono">
                                {loading ? "—" : `$${(kpis.rosterValue / 1000000).toFixed(1)}M`}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-purple-500/30 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                            <UserPlus className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Hires</p>
                            <p className="text-2xl font-black text-navy-blue mt-1 flex items-baseline gap-2">
                                {loading ? "—" : kpis.newHires}
                                <span className="text-[10px] text-slate-400 font-normal">This Month</span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-red-500/30 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <UserMinus className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attrition</p>
                            <p className="text-2xl font-black text-navy-blue mt-1 flex items-baseline gap-2">
                                {loading ? "—" : kpis.attritionCount}
                                <span className="text-[10px] text-slate-400 font-normal">This Month</span>
                            </p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-orange-500/30 transition-colors relative overflow-hidden">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 relative z-10">
                            <TrendingDown className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attrition Rate</p>
                            <p className="text-2xl font-black text-orange-600 mt-1">{loading ? "—" : `${kpis.attritionRate}%`}</p>
                        </div>
                        <div className="absolute right-0 bottom-0 top-0 w-16 bg-gradient-to-l from-orange-50 to-transparent z-0" />
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Bar Chart - Headcount by Area */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-navy-blue">Headcount Distribution by Area</h3>
                                <p className="text-xs text-slate-500 mt-1">Double-click bars to dive into employee list</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[300px]">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>
                            ) : hcByArea.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={hcByArea}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                        onDoubleClick={handleChartDoubleClick}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                                        <Bar
                                            dataKey="value"
                                            radius={[4, 4, 0, 0]}
                                            fill="#002B5B"
                                            activeBar={{ fill: '#0047AB' }}
                                        >
                                            {hcByArea.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Salary Impact Pie Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                        <div className="mb-2">
                            <h3 className="text-lg font-bold text-navy-blue">Payroll Impact</h3>
                            <p className="text-xs text-slate-500 mt-1">Cost distribution by area</p>
                        </div>
                        <div className="flex-1 min-h-[250px] relative">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>
                            ) : salaryByArea.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400">No data available.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={salaryByArea}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            cursor="pointer"
                                            onClick={handlePieDoubleClick}
                                        >
                                            {salaryByArea.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ops vs Non Ops */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="mb-6">
                            <h3 className="text-base font-bold text-navy-blue">Operations vs Supporting Team</h3>
                            <p className="text-xs text-slate-500 mt-1">Roster composition</p>
                        </div>
                        <div className="flex items-center justify-center gap-8 h-[200px]">
                            {loading ? (
                                <span className="text-slate-400">Loading...</span>
                            ) : (
                                <>
                                    {opsDistribution.map((item, idx) => (
                                        <div
                                            key={item.name}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer hover:shadow-md transition-all border",
                                                idx === 0 ? "bg-emerald-50 border-emerald-100 w-1/2" : "bg-slate-50 border-slate-200 w-1/2"
                                            )}
                                            onDoubleClick={() => setDeepDiveData({ title: item.name, data: item.employees })}
                                            title="Double click to view employees"
                                        >
                                            <p className="text-3xl font-black" style={{ color: idx === 0 ? '#059669' : '#475569' }}>
                                                {item.value} <span className="text-sm font-medium">({((item.value / filteredEmployees.length) * 100).toFixed(0)}%)</span>
                                            </p>
                                            <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">{item.name}</p>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {deepDiveData && (
                <DeepDiveModal
                    title={deepDiveData.title}
                    data={deepDiveData.data}
                    onClose={() => setDeepDiveData(null)}
                />
            )}
        </div>
    );
};
