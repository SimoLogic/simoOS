"use client";

import React, { useState } from "react";
import { TopBar } from "./TopBar";
import { SideMenu, ModuleId } from "./SideMenu";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { TenantProvider } from "@/lib/tenant-context";

interface MainLayoutProps {
    children: (activeModule: ModuleId) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [activeModule, setActiveModule] = useState<ModuleId>("business-plan");
    const [showAdmin, setShowAdmin] = useState(false);

    const handleHomeClick = () => {
        setActiveModule("business-plan");
    };

    return (
        <TenantProvider>
            <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
                <TopBar onHomeClick={handleHomeClick} />
                <SideMenu
                    activeModule={activeModule}
                    onSelectModule={setActiveModule}
                    onAdminClick={() => setShowAdmin(true)}
                />
                {/* Main content: offset by topbar height (14 = 3.5rem) and collapsed sidebar width (14 = 3.5rem) */}
                <main className="pt-14 pl-14 h-screen flex flex-col overflow-hidden transition-all duration-300">
                    <div className="flex-1 overflow-hidden">
                        {children(activeModule)}
                    </div>
                </main>

                {/* Admin Panel Overlay */}
                {showAdmin && (
                    <AdminPanel onClose={() => setShowAdmin(false)} />
                )}
            </div>
        </TenantProvider>
    );
};
