"use client";

import { useState } from "react";
import { useTenant } from "@/lib/tenant-context";
import { PlaybookDirectory } from "./playbook-designer/PlaybookDirectory";
import { PlaybookEditorView } from "./playbook-designer/PlaybookEditorView";
import { PlaybookVisualizerView } from "./playbook-designer/PlaybookVisualizerView";
import { PlaybookSetupView } from "./playbook-designer/PlaybookSetupView";
import { PlaybookInboxView } from "./playbook-designer/PlaybookInboxView";
import { BookOpen, Settings, Inbox, Library } from "lucide-react";

type HubView = "directory" | "editor" | "visualizer" | "setup" | "inbox";

const hubTabs = [
    { id: "directory" as HubView, label: "Directory", icon: Library },
    { id: "inbox" as HubView, label: "My Inbox", icon: Inbox },
    { id: "setup" as HubView, label: "Setup", icon: Settings },
];

export function PlaybookDesignerHub() {
    const { currentTenant } = useTenant();
    const [view, setView] = useState<HubView>("directory");
    const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>("new");

    const handleNavigate = (targetView: HubView | "editor" | "visualizer", playbookId?: string) => {
        if (playbookId) setSelectedPlaybookId(playbookId);
        setView(targetView as HubView);
    };

    // Editor and Visualizer are full-screen sub-views — hide the tab bar
    const showTabBar = view !== "editor" && view !== "visualizer";

    return (
        <div className="flex h-full flex-col bg-white">

            {/* Internal Sub-navigation — only shown for top-level views */}
            {showTabBar && (
                <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-6">
                    {hubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = view === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap uppercase tracking-wider ${isActive
                                        ? "text-[#002B5B]"
                                        : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0047AB] rounded-t-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {view === "directory" && (
                    <PlaybookDirectory onNavigate={handleNavigate} />
                )}
                {view === "editor" && currentTenant && (
                    <PlaybookEditorView
                        playbookId={selectedPlaybookId}
                        tenantId={currentTenant.tenant_id}
                        onBack={() => setView("directory")}
                    />
                )}
                {view === "visualizer" && currentTenant && (
                    <PlaybookVisualizerView
                        playbookId={selectedPlaybookId}
                        tenantId={currentTenant.tenant_id}
                        onBack={() => setView("directory")}
                    />
                )}
                {view === "setup" && currentTenant && (
                    <PlaybookSetupView tenantId={currentTenant.tenant_id} />
                )}
                {view === "inbox" && (
                    <PlaybookInboxView />
                )}
                {!currentTenant && view !== "directory" && view !== "inbox" && (
                    <div className="flex h-full items-center justify-center text-gray-400">
                        <div className="text-center">
                            <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <p className="text-sm font-medium">Please select a Tenant first.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
