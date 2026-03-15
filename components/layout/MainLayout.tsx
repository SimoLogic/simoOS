"use client";

import React, { useState } from "react";
import { TopBar } from "./TopBar";
import { SideMenu, ModuleId } from "./SideMenu";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { TenantProvider } from "@/lib/tenant-context";

interface MainLayoutProps {
    children: (activeModule: ModuleId) => React.ReactNode;
}

import { usePmoStore } from "@/lib/stores/pmo.store";
import { AiSummaryModal } from "@/components/pmo/shared/AiSummaryModal";

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [activeModule, setActiveModule] = useState<ModuleId>("business-plan");
    const [showAdmin, setShowAdmin] = useState(false);
    const [showAiSummary, setShowAiSummary] = useState(false);
    
    const activeBoardId = usePmoStore(s => s.activeBoardId);

    const handleHomeClick = () => {
        setActiveModule("business-plan");
    };

    return (
        <TenantProvider>
            <div className="flex flex-col h-screen bg-[var(--vibe-surface)] font-sans text-[var(--vibe-text-prime)] overflow-hidden">
                <TopBar onHomeClick={handleHomeClick} />
                
                <div className="flex flex-1 overflow-hidden relative">
                    <SideMenu
                        activeModule={activeModule}
                        onSelectModule={setActiveModule}
                        onAdminClick={() => setShowAdmin(true)}
                        onAiSummaryClick={() => setShowAiSummary(true)}
                    />
                    
                    {/* Main content area — whiteboard style for clarity (HOMESI Rule) */}
                    <main className="flex-1 ml-16 h-full flex flex-col overflow-hidden bg-white transition-all duration-[var(--motion-productive-medium)] ease-[var(--ease-productive)]">
                        {children(activeModule)}
                    </main>
                </div>

                {/* Admin Panel Overlay */}
                {showAdmin && (
                    <AdminPanel onClose={() => setShowAdmin(false)} />
                )}

                {/* AI Summary Modal */}
                {showAiSummary && activeBoardId && (
                    <AiSummaryModal 
                        orgId="org-1" 
                        boardId={activeBoardId} 
                        onClose={() => setShowAiSummary(false)} 
                    />
                )}
            </div>
        </TenantProvider>
    );
};
