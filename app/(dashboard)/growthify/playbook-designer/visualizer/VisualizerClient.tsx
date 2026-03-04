"use client";

import { useState } from "react";
import { User, FileText, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface StepNode {
    id: string;
    position: { x: number; y: number };
    data: {
        stepNumber: number;
        activityName: string;
        ownerType: string;
        deliverableName: string;
        frequency: string;
        hasContraPlaybook: boolean;
        dayOffset: number;
    };
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

// ─── Custom Flow Node Card ────────────────────────────────────────────────────
function FlowNode({ node, isSelected, fadeOut, onClick }: { node: StepNode; isSelected: boolean; fadeOut: boolean; onClick: () => void }) {
    const { data } = node;
    const opacity = fadeOut ? 0.25 : 1;

    return (
        <g
            transform={`translate(${node.position.x}, ${node.position.y})`}
            onClick={onClick}
            style={{ cursor: "pointer", transition: "opacity 0.3s ease", opacity }}
        >
            {/* Card shadow & glow */}
            <rect x={2} y={4} width={260} height={124} rx={14} fill={isSelected ? "rgba(0,43,91,0.2)" : "rgba(0,0,0,0.06)"} filter={isSelected ? "url(#glow)" : ""} />
            {/* Card background */}
            <rect
                x={0} y={0} width={260} height={124} rx={14}
                fill="#ffffff"
                stroke={isSelected ? "#002B5B" : "#e2e8f0"}
                strokeWidth={isSelected ? 3 : 1}
            />
            {/* Header bar */}
            <path d="M0 14 C0 6.268 6.268 0 14 0 L246 0 C253.732 0 260 6.268 260 14 L260 38 L0 38 L0 14 Z" fill="#002B5B" />

            {/* Step number badge */}
            <circle cx={22} cy={19} r={12} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
            <text x={22} y={23} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="800" fontFamily="sans-serif">{data.stepNumber}</text>

            {/* Activity name */}
            <text x={42} y={23} fill="#ffffff" fontSize={12} fontWeight="600" fontFamily="sans-serif">
                {data.activityName.length > 25 ? data.activityName.slice(0, 25) + "…" : data.activityName}
            </text>

            {/* Owner badge */}
            <rect x={16} y={48} width={26} height={20} rx={4} fill="#f1f5f9" />
            <text x={29} y={62} textAnchor="middle" fontSize={12}>👤</text>
            <text x={50} y={62} fill="#334155" fontSize={11} fontWeight="500" fontFamily="sans-serif">{data.ownerType} Executor</text>

            {/* Deliverable/Stakeholder info */}
            <rect x={16} y={74} width={26} height={20} rx={4} fill="#f1f5f9" />
            <text x={29} y={88} textAnchor="middle" fontSize={12}>📄</text>
            <text x={50} y={88} fill="#64748b" fontSize={10} fontFamily="sans-serif">
                {(data.deliverableName || "General Execution").length > 32
                    ? (data.deliverableName || "General Execution").slice(0, 32) + "…"
                    : (data.deliverableName || "General Execution")}
            </text>

            {/* Bottom pills */}
            <rect x={16} y={100} width={65} height={18} rx={9} fill="#eff6ff" stroke="#bfdbfe" />
            <text x={48} y={113} textAnchor="middle" fill="#1e40af" fontSize={9} fontWeight="700" fontFamily="sans-serif">
                {data.frequency || "Anytime"}
            </text>

            {data.hasContraPlaybook && (
                <>
                    <rect x={88} y={100} width={100} height={18} rx={9} fill="#fff7ed" stroke="#fed7aa" />
                    <text x={138} y={113} textAnchor="middle" fill="#c2410c" fontSize={9} fontWeight="700" fontFamily="sans-serif">
                        ⚡ Linked Contra-Task
                    </text>
                </>
            )}

            {/* Wait Offset Label Float */}
            {data.dayOffset > 0 && (
                <g transform="translate(195, 12)">
                    <rect x={0} y={0} width={50} height={16} rx={4} fill="rgba(255,255,255,0.2)" />
                    <text x={25} y={11} textAnchor="middle" fill="#e2e8f0" fontSize={8} fontWeight="bold" fontFamily="sans-serif">
                        D+{data.dayOffset}
                    </text>
                </g>
            )}

            {/* Connection ports */}
            <circle cx={130} cy={124} r={6} fill="#002B5B" stroke="#ffffff" strokeWidth={2} />
            <circle cx={130} cy={0} r={6} fill="#002B5B" stroke="#ffffff" strokeWidth={2} />
        </g>
    );
}

// ─── Main Visualizer ─────────────────────────────────────────────────────────
export function VisualizerClient({ initialNodes, initialEdges }: { initialNodes: any[]; initialEdges: any[] }) {
    const [zoom, setZoom] = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filterRole, setFilterRole] = useState<string>("All");
    const [filterFreq, setFilterFreq] = useState<string>("All");

    const nodes: StepNode[] = initialNodes;
    const edges: Edge[] = initialEdges;

    // Compute SVG viewport from node positions
    const allX = nodes.map((n) => n.position.x);
    const allY = nodes.map((n) => n.position.y);
    const minX = Math.min(0, ...allX) - 100;
    const minY = Math.min(0, ...allY) - 100;
    const maxX = Math.max(...allX) + 360;
    const maxY = Math.max(...allY) + 200;

    const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

    const zoomIn = () => setZoom((z) => Math.min(z + 0.15, 2.5));
    const zoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));
    const resetZoom = () => setZoom(1);

    // Derived distinct options for filters
    const uniqueFreqs = Array.from(new Set(nodes.map(n => n.data.frequency).filter(Boolean)));
    const uniqueRoles = Array.from(new Set(nodes.map(n => n.data.ownerType).filter(Boolean)));

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-50">
            {/* Top HUD Filters */}
            <div className="absolute left-6 top-6 z-10 flex gap-4 rounded-xl border border-gray-200 bg-white/90 p-3 shadow-md backdrop-blur-md">
                <div className="flex flex-col">
                    <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Filter by Executing Role</label>
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="rounded-md border-0 bg-gray-100 py-1.5 pl-3 pr-8 text-sm font-medium text-[#002B5B] focus:ring-2 focus:ring-[#002B5B]"
                    >
                        <option value="All">All Roles</option>
                        {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex flex-col">
                    <label className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Filter by Frequency</label>
                    <select
                        value={filterFreq}
                        onChange={e => setFilterFreq(e.target.value)}
                        className="rounded-md border-0 bg-gray-100 py-1.5 pl-3 pr-8 text-sm font-medium text-[#002B5B] focus:ring-2 focus:ring-[#002B5B]"
                    >
                        <option value="All">All Frequencies</option>
                        {uniqueFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute right-6 top-6 z-10 flex flex-col gap-2">
                <button onClick={zoomIn} title="Zoom In" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-md hover:bg-gray-50 transition-colors">
                    <ZoomIn className="h-5 w-5 text-[#002B5B]" />
                </button>
                <button onClick={zoomOut} title="Zoom Out" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-md hover:bg-gray-50 transition-colors">
                    <ZoomOut className="h-5 w-5 text-[#002B5B]" />
                </button>
                <button onClick={resetZoom} title="Reset" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-md hover:bg-gray-50 transition-colors">
                    <Maximize2 className="h-5 w-5 text-[#002B5B]" />
                </button>
            </div>

            {/* Dot grid background */}
            <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                    <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dot-grid)" />
            </svg>

            {/* Main canvas */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-auto"
                style={{ padding: "60px" }}
            >
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s" }}>
                    <svg
                        viewBox={viewBox}
                        width={maxX - minX}
                        height={maxY - minY}
                        style={{ overflow: "visible" }}
                    >
                        {/* Draw edges first (behind nodes) */}
                        {edges.map((edge) => {
                            const src = nodeById[edge.source];
                            const tgt = nodeById[edge.target];
                            if (!src || !tgt) return null;
                            const x1 = src.position.x + 120;
                            const y1 = src.position.y + 110;
                            const x2 = tgt.position.x + 120;
                            const y2 = tgt.position.y;
                            const midY = (y1 + y2) / 2;
                            return (
                                <g key={edge.id}>
                                    <path
                                        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                        fill="none"
                                        stroke="#002B5B"
                                        strokeWidth={2}
                                        strokeOpacity={0.6}
                                        markerEnd="url(#arrow)"
                                    />
                                </g>
                            );
                        })}

                        {/* Arrow marker & Glow definition */}
                        <defs>
                            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <path d="M0,0 L0,6 L9,3 z" fill="#002B5B" fillOpacity={0.8} />
                            </marker>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="6" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Draw nodes */}
                        {nodes.map((node) => {
                            const isFilteredOut =
                                (filterRole !== "All" && node.data.ownerType !== filterRole) ||
                                (filterFreq !== "All" && node.data.frequency !== filterFreq);

                            return (
                                <FlowNode
                                    key={node.id}
                                    node={node}
                                    isSelected={selectedId === node.id}
                                    fadeOut={isFilteredOut}
                                    onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
                                />
                            );
                        })}

                        {/* Empty state */}
                        {nodes.length === 0 && (
                            <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8" fontSize={14}>
                                No steps to visualize yet.
                            </text>
                        )}
                    </svg>
                </div>
            </div>

            {/* Node count badge */}
            <div className="absolute bottom-4 left-4 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm">
                {nodes.length} steps · {edges.length} connections
            </div>
        </div>
    );
}
