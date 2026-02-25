"use client";

import React, { useState, useEffect } from "react";
import {
    Save, Plus, Settings, CalendarDays, Key, BookOpen, AlertTriangle,
    MoreVertical, Edit3, Trash2, ChevronRight, Video, FileText, Share2, Shield, Activity, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import {
    Playbook, PlaybookStep, PlaybookFrequency, EscalationRule, SalesStrategy
} from "@/lib/growthify-types";
import {
    getSalesStrategies, savePlaybook, getPlaybooks
} from "@/lib/growthify-store";

// Dummy data for initial dev
const DUMMY_STRATEGIES: SalesStrategy[] = [
    { id: "strat-b2b", tenant_id: "TENANT-001", name: "B2B Outreach", purpose: "Engaging realtors", isActive: true, created_at: "" },
    { id: "strat-nppm", tenant_id: "TENANT-001", name: "NPPM Partners", purpose: "Non-QM alliances", isActive: true, created_at: "" },
];

export const PlaybookDesigner: React.FC = () => {
    const { currentTenant } = useTenant();

    // Core State
    const [strategies, setStrategies] = useState<SalesStrategy[]>([]);
    const [playbookName, setPlaybookName] = useState("");
    const [playbookPurpose, setPlaybookPurpose] = useState("");
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
    const [playbookCategory, setPlaybookCategory] = useState<"commercial" | "supporting" | "special">("commercial");

    // Playbook Canvas State
    const [steps, setSteps] = useState<PlaybookStep[]>([]);
    const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);

    // Step Modal State
    const [isStepModalOpen, setIsStepModalOpen] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [stepTitle, setStepTitle] = useState("");
    const [stepDesc, setStepDesc] = useState("");
    const [stepFreq, setStepFreq] = useState<PlaybookFrequency>("Daily");
    const [stepTarget, setStepTarget] = useState<number>(1);
    const [stepScript, setStepScript] = useState("");
    const [stepVideo, setStepVideo] = useState("");

    // Rule Modal State
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [ruleMetric, setRuleMetric] = useState("Activity Progress");
    const [ruleThreshold, setRuleThreshold] = useState<number>(80);
    const [ruleDays, setRuleDays] = useState<number>(3);
    const [ruleAction, setRuleAction] = useState<EscalationRule["action_type"]>("Manager Alert");

    // UI State
    const [activeTab, setActiveTab] = useState<"canvas" | "settings">("canvas");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentTenant) {
            getSalesStrategies(currentTenant.tenant_id).then(loadedStrats => {
                setStrategies(loadedStrats.length > 0 ? loadedStrats : DUMMY_STRATEGIES);
            });
        }
    }, [currentTenant]);

    const handleSave = () => {
        if (!currentTenant || !selectedStrategyId || !playbookName) return;
        setIsSaving(true);
        savePlaybook({
            tenant_id: currentTenant.tenant_id,
            strategy_id: selectedStrategyId,
            name: playbookName,
            general_purpose: playbookPurpose,
            category: playbookCategory,
            steps,
            escalation_matrix: escalationRules,
            isActive: true
        });
        setTimeout(() => setIsSaving(false), 800);
    };

    const openStepModal = (step?: PlaybookStep) => {
        if (step) {
            setEditingStepId(step.id);
            setStepTitle(step.title);
            setStepDesc(step.description);
            setStepFreq(step.frequency);
            setStepTarget(step.target_count);
            setStepScript(step.script_content || "");
            setStepVideo(step.training_url || "");
        } else {
            setEditingStepId(null);
            setStepTitle("");
            setStepDesc("");
            setStepFreq("Daily");
            setStepTarget(1);
            setStepScript("");
            setStepVideo("");
        }
        setIsStepModalOpen(true);
    };

    const saveStep = () => {
        if (!stepTitle || stepTarget < 1) return;
        const newStep: PlaybookStep = {
            id: editingStepId || `STP-${Date.now()}`,
            title: stepTitle,
            description: stepDesc,
            frequency: stepFreq,
            target_count: stepTarget,
            script_content: stepScript,
            training_url: stepVideo,
            is_mandatory: true
        };

        if (editingStepId) {
            setSteps(steps.map(s => s.id === editingStepId ? newStep : s));
        } else {
            setSteps([...steps, newStep]);
        }
        setIsStepModalOpen(false);
    };

    const deleteStep = (id: string) => {
        setSteps(steps.filter(s => s.id !== id));
    };

    const saveRule = () => {
        const newRule: EscalationRule = {
            id: `RULE-${Date.now()}`,
            trigger_metric: ruleMetric,
            threshold_pct: ruleThreshold,
            duration_days: ruleDays,
            action_type: ruleAction
        };
        setEscalationRules([...escalationRules, newRule]);
        setIsRuleModalOpen(false);
    };

    const deleteRule = (id: string) => {
        setEscalationRules(escalationRules.filter(r => r.id !== id));
    };

    // Calculate dynamic UI tint based on category to enforce "Precision Zones"
    const getCanvasBackground = () => {
        switch (playbookCategory) {
            case "commercial": return "bg-white/95 before:absolute before:inset-0 before:bg-blue-50/30 before:pointer-events-none";
            case "supporting": return "bg-white/95 before:absolute before:inset-0 before:bg-slate-50/50 before:pointer-events-none";
            case "special": return "bg-white/95 before:absolute before:inset-0 before:bg-rose-50/20 before:pointer-events-none";
            default: return "bg-white/95";
        }
    };

    const getCategoryIcon = () => {
        switch (playbookCategory) {
            case "commercial": return <Activity className="w-4 h-4 text-cobalt-blue" />;
            case "supporting": return <Share2 className="w-4 h-4 text-slate-500" />;
            case "special": return <Shield className="w-4 h-4 text-action-red" />;
            default: return <BookOpen className="w-4 h-4 text-cobalt-blue" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Header Toolbar - Pure White Background for Clarity */}
            <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0 z-10 shadow-sm relative">
                <div>
                    <h2 className="text-xl font-bold text-navy-blue flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                            playbookCategory === "commercial" ? "bg-blue-50 border-blue-100" :
                                playbookCategory === "supporting" ? "bg-slate-50 border-slate-200" :
                                    "bg-rose-50 border-rose-100"
                        )}>
                            {getCategoryIcon()}
                        </div>
                        Playbook Designer
                    </h2>
                    <p className="text-[13px] text-slate-400 mt-1 font-medium">
                        Engineer the execution mesh: define daily habits, content, and escalation matrices.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-50/50 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
                        <button
                            onClick={() => setActiveTab("canvas")}
                            className={cn(
                                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === "canvas" ? "bg-white text-navy-blue shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Builder Canvas</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={cn(
                                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === "settings" ? "bg-white text-navy-blue shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Parameters</span>
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !playbookName || !selectedStrategyId || steps.length === 0}
                        className="bg-cobalt-blue hover:bg-navy-blue hover:shadow-lg hover:shadow-cobalt-blue/30 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:border border-slate-200 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Compiling..." : "Compile Engine"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex relative bg-white">

                {/* Background Tint Base based on Category */}
                <div className={cn("absolute inset-0 z-0 transition-colors duration-500", getCanvasBackground())} />

                {/* Visual Canvas Area */}
                <div className="flex-1 overflow-y-auto px-8 py-10 relative z-10 w-full">
                    <div className="max-w-4xl mx-auto pl-4">

                        {/* Empty State / Instructional */}
                        {steps.length === 0 && (
                            <div className="text-center py-24 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 mt-10">
                                <div className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border",
                                    playbookCategory === "commercial" ? "bg-blue-50 border-blue-100" :
                                        playbookCategory === "supporting" ? "bg-slate-50 border-slate-200" :
                                            "bg-rose-50 border-rose-100"
                                )}>
                                    {React.cloneElement(getCategoryIcon(), {
                                        className: cn("w-10 h-10",
                                            playbookCategory === "commercial" ? "text-cobalt-blue" :
                                                playbookCategory === "supporting" ? "text-slate-500" :
                                                    "text-action-red"
                                        )
                                    })}
                                </div>
                                <h3 className="text-2xl font-bold text-navy-blue mb-3">Architect the Execution</h3>
                                <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8 leading-relaxed">
                                    Start engineering the mesh by defining the precise, mandatory sequence of actions needed for this <span className="font-bold text-navy-blue uppercase tracking-widest text-[10px]">{playbookCategory}</span> playbook.
                                </p>
                                <button
                                    onClick={() => openStepModal()}
                                    className="bg-white border-2 border-slate-200 text-navy-blue font-bold px-6 py-3 rounded-xl text-sm hover:border-cobalt-blue hover:text-cobalt-blue hover:shadow-lg hover:shadow-cobalt-blue/10 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <Plus className="w-5 h-5" /> Add Initial Node
                                </button>
                            </div>
                        )}

                        {/* Render Steps */}
                        {steps.length > 0 && (
                            <div className="space-y-6 py-8 relative">
                                {/* Vertical connection line */}
                                <div className="absolute left-[39px] top-6 bottom-16 w-0.5 bg-slate-200 z-0" />

                                {steps.map((step, idx) => (
                                    <div key={step.id} className="relative z-10 flex gap-6 pr-10 group/node">
                                        {/* Timeline Node */}
                                        <div className="w-20 shrink-0 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-white border-[3px] border-cobalt-blue shadow-md flex items-center justify-center text-cobalt-blue font-black text-sm relative z-10">
                                                {idx + 1}
                                            </div>
                                            <div className="mt-3 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 shadow-sm relative z-10">
                                                {step.frequency}
                                            </div>
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl p-6 hover:border-cobalt-blue/50 hover:shadow-md hover:shadow-cobalt-blue/10 transition-all group-hover/node:-translate-y-0.5 relative">
                                            {/* Hover Toolbar */}
                                            <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
                                                <button onClick={() => openStepModal(step)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-cobalt-blue hover:text-white hover:border-cobalt-blue text-slate-400 flex items-center justify-center transition-all">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteStep(step.id)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-action-red hover:text-white hover:border-action-red text-slate-400 flex items-center justify-center transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <h4 className="text-lg font-bold text-navy-blue mb-3 pr-20">{step.title}</h4>
                                            <p className="text-[13px] text-slate-500 mb-6 leading-relaxed max-w-2xl">{step.description}</p>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                                                    <Key className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-600">Target: <span className="text-navy-blue">{step.target_count}</span></span>
                                                </div>

                                                {step.script_content && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                        <FileText className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-xs font-bold text-emerald-700">Script Integrated</span>
                                                    </div>
                                                )}

                                                {step.training_url && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
                                                        <Video className="w-4 h-4 text-purple-500" />
                                                        <span className="text-xs font-bold text-purple-700">Video Attached</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Next Step Button */}
                                <div className="relative z-10 flex gap-6 mt-8">
                                    <div className="w-20 shrink-0 flex items-center justify-center">
                                        <button
                                            onClick={() => openStepModal()}
                                            className="w-12 h-12 rounded-full bg-slate-50 border-[3px] border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:bg-cobalt-blue hover:text-white hover:border-cobalt-blue hover:scale-110 shadow-sm transition-all"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center h-12">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-cobalt-blue transition-colors" onClick={() => openStepModal()}>
                                            Append Node
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Step Modal --- */}
                {isStepModalOpen && (
                    <div className="fixed inset-0 bg-navy-blue/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 anima-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/50 anima-slide-up">
                            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                                <h3 className="text-lg font-black text-navy-blue flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-cobalt-blue" />
                                    </div>
                                    {editingStepId ? "Edit Execution Node" : "Configure New Node"}
                                </h3>
                                <button onClick={() => setIsStepModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy-blue hover:bg-slate-100 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 space-y-6 bg-slate-50/30">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Node Nomenclature</label>
                                        <input
                                            type="text" value={stepTitle} onChange={e => setStepTitle(e.target.value)}
                                            placeholder="e.g. Initial Outreach Contact"
                                            className="w-full text-sm font-medium p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Tactical Execution Instructions</label>
                                        <textarea
                                            value={stepDesc} onChange={e => setStepDesc(e.target.value)}
                                            placeholder="Define exactly what the operator must execute..."
                                            className="w-full h-24 text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white resize-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Cadence</label>
                                        <select
                                            value={stepFreq} onChange={(e) => setStepFreq(e.target.value as PlaybookFrequency)}
                                            className="w-full text-sm font-medium p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white transition-all shadow-sm appearance-none cursor-pointer"
                                        >
                                            <option value="Daily">Daily Execution</option>
                                            <option value="Weekly">Weekly Execution</option>
                                            <option value="Monthly">Monthly Target</option>
                                            <option value="Once">One-Time Event</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Volume Target</label>
                                        <div className="relative">
                                            <input
                                                type="number" min="1" value={stepTarget} onChange={e => setStepTarget(parseInt(e.target.value) || 1)}
                                                className="w-full text-sm font-bold p-3 pl-11 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white transition-all shadow-sm"
                                            />
                                            <Key className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 bg-white rounded-2xl p-6 mt-6 shadow-sm">
                                    <h4 className="text-[11px] uppercase tracking-widest font-bold text-navy-blue mb-5 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Embedded Assets
                                    </h4>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center">
                                                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                Execution Script (Optional)
                                            </label>
                                            <textarea
                                                value={stepScript} onChange={e => setStepScript(e.target.value)}
                                                placeholder="Paste email script or call track here..."
                                                className="w-full h-24 text-[13px] p-3 font-mono bg-slate-50 text-slate-600 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 resize-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center">
                                                    <Video className="w-3.5 h-3.5 text-purple-500" />
                                                </div>
                                                Training Source URL (Optional)
                                            </label>
                                            <input
                                                type="text" value={stepVideo} onChange={e => setStepVideo(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-slate-50 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-3xl">
                                <button
                                    onClick={() => setIsStepModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={saveStep}
                                    disabled={!stepTitle}
                                    className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-cobalt-blue hover:bg-navy-blue hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-sm"
                                >
                                    {editingStepId ? "Update Node" : "Inject Node"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sidebar (Configuration & Escalation) - Slides in on activeTab settings */}
                <div
                    className={cn(
                        "w-96 bg-white border-l border-slate-200 shadow-2xl z-40 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) h-full flex flex-col absolute right-0 top-0",
                        activeTab === "settings" ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    <div className="p-6 border-b border-slate-100 shrink-0 bg-white">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-navy-blue flex items-center gap-2 uppercase tracking-widest">
                                <Settings className="w-4 h-4 text-cobalt-blue" />
                                Meta Parameters
                            </h3>
                            <button onClick={() => setActiveTab("canvas")} className="text-slate-400 hover:text-navy-blue p-1 rounded-md hover:bg-slate-50">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 flex flex-col gap-8 flex-1 overflow-y-auto bg-slate-50/30">
                        {/* Core Identification */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Category Binding</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "commercial", label: "Commercial", icon: Activity, color: "text-cobalt-blue", bg: "bg-blue-50 border-blue-200" },
                                        { id: "supporting", label: "Supporting", icon: Share2, color: "text-slate-600", bg: "bg-slate-100 border-slate-300" },
                                        { id: "special", label: "Special", icon: Shield, color: "text-action-red", bg: "bg-rose-50 border-rose-200" }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setPlaybookCategory(cat.id as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                                                playbookCategory === cat.id ? cat.bg : "bg-white border-slate-100 hover:border-slate-200 text-slate-400"
                                            )}
                                        >
                                            <cat.icon className={cn("w-5 h-5", playbookCategory === cat.id ? cat.color : "text-slate-400")} />
                                            <span className={cn("text-[10px] font-bold uppercase", playbookCategory === cat.id ? cat.color : "text-slate-500")}>
                                                {cat.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Playbook Nomenclature</label>
                                <input
                                    type="text"
                                    value={playbookName}
                                    onChange={(e) => setPlaybookName(e.target.value)}
                                    placeholder="e.g. The 7-Touch B2B"
                                    className="w-full text-sm font-bold p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white shadow-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Target Strategy (Parent)</label>
                                <select
                                    value={selectedStrategyId}
                                    onChange={(e) => setSelectedStrategyId(e.target.value)}
                                    className="w-full text-sm font-medium p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white shadow-sm transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Link to Strategy...</option>
                                    {strategies.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">
                                    Strategic Genesis (Purpose)
                                </label>
                                <textarea
                                    value={playbookPurpose}
                                    onChange={(e) => setPlaybookPurpose(e.target.value)}
                                    placeholder="Defines the ultimate outcome..."
                                    className="w-full h-24 text-[13px] p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 bg-white resize-none shadow-sm transition-all leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Escalation Matrix Section */}
                        <div className="pt-6 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-action-red" /> Escalation Matrices
                                </label>
                                <button
                                    onClick={() => {
                                        setRuleMetric("Activity Progress"); setRuleThreshold(80); setRuleDays(3); setRuleAction("Manager Alert");
                                        setIsRuleModalOpen(true);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-cobalt-blue hover:text-white hover:border-cobalt-blue transition-all text-slate-400"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {escalationRules.length === 0 ? (
                                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-center text-xs font-medium text-slate-400 shadow-sm">
                                    No escalation limits defined. <br />The system requires rules to force accountability.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {escalationRules.map(rule => (
                                        <div key={rule.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-cobalt-blue/30 transition-colors group relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-action-red" />
                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                <span className="text-xs font-black text-navy-blue uppercase tracking-tight flex items-center gap-1.5">
                                                    {rule.action_type}
                                                </span>
                                                <button onClick={() => deleteRule(rule.id)} className="text-slate-300 hover:text-action-red opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-slate-500 pl-2">
                                                If <strong className="text-slate-700">{rule.trigger_metric}</strong> drops below <strong className="text-slate-700 bg-rose-50 text-action-red px-1 rounded">{rule.threshold_pct}%</strong> for <strong className="text-slate-700 border-b border-slate-300">{rule.duration_days} consecutive days</strong>.
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Escalation Rule Modal --- */}
                {isRuleModalOpen && (
                    <div className="fixed inset-0 bg-navy-blue/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 anima-fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-100/50 anima-slide-up">
                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                                <h3 className="text-base font-black text-navy-blue flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-action-red" /> Define Rule Limit
                                </h3>
                                <button onClick={() => setIsRuleModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy-blue transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 bg-slate-50/30">
                                <div>
                                    <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Trigger Condition</label>
                                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 pl-3">If</span>
                                        <select
                                            value={ruleMetric} onChange={e => setRuleMetric(e.target.value)}
                                            className="flex-1 text-sm p-2 border-0 bg-transparent focus:outline-none font-bold text-navy-blue"
                                        >
                                            <option value="Activity Progress">Activity Progress</option>
                                            <option value="Milestones Met">Milestones Met</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                    <span className="text-xs font-bold text-slate-400 pl-3 whitespace-nowrap">fails targets by</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="number" min="1" max="100" value={ruleThreshold} onChange={e => setRuleThreshold(parseInt(e.target.value) || 1)}
                                            className="w-full text-sm p-2 pr-8 border-0 bg-transparent focus:outline-none font-black text-action-red text-right"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-action-red">%</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                    <span className="text-xs font-bold text-slate-400 pl-3 whitespace-nowrap">for over</span>
                                    <input
                                        type="number" min="1" max="30" value={ruleDays} onChange={e => setRuleDays(parseInt(e.target.value) || 1)}
                                        className="w-16 text-sm p-2 border-0 bg-transparent focus:outline-none font-black text-navy-blue text-center"
                                    />
                                    <span className="text-xs font-bold text-slate-400 pr-3">days.</span>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-2">Automated Consequence</label>
                                    <select
                                        value={ruleAction}
                                        onChange={(e) => setRuleAction(e.target.value as EscalationRule["action_type"])}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-cobalt-blue focus:ring-4 focus:ring-cobalt-blue/10 font-bold text-navy-blue bg-white shadow-sm"
                                    >
                                        <option value="Manager Alert">Launch Manager Alert</option>
                                        <option value="Coaching Lock">Lock Systems for Coaching</option>
                                        <option value="PIP Warning">Issue PIP Warning</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-3xl">
                                <button onClick={() => setIsRuleModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Discard</button>
                                <button onClick={saveRule} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-navy-blue hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm">Inject Rule</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
