"use client";

import { Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export default function LocalizedHome() {
    return (
        <MainLayout>
            {(activeModule) => (
                <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400">Loading module...</div>}>
                    <DashboardContent activeModule={activeModule} />
                </Suspense>
            )}
        </MainLayout>
    );
}
