"use client";

import React from "react";
import { ActivityReportView } from "./activity/ActivityReportView";
import { ForecastPipelineView } from "./forecast/ForecastPipelineView";

interface CommercialActivityModuleProps {
    /** "activity" | "forecast" — ids definidos en moduleSubModules (ModuleNavigation.tsx) */
    activeSubModule: string;
}

/**
 * Módulo Commercial Activity & Forecast.
 *
 * Integra 1:1 el repo homesi-reporte-actividad (compartido por Heather)
 * como un módulo nativo de simoOS, sin alterar su lógica de negocio —
 * ver /lib/commercial-activity/* para el código portado.
 *
 * Dos tabs, controlados por el patrón estándar de simoOS
 * (ModuleNavigation + DashboardContent, igual que HR/PMO/Growthify):
 *   - "activity"  -> ActivityReportView  (File Creations, Credit Reports, App, Closings)
 *   - "forecast"  -> ForecastPipelineView (Pull-through pipeline forecast)
 */
export const CommercialActivityModule: React.FC<CommercialActivityModuleProps> = ({
    activeSubModule,
}) => {
    return (
        <div className="flex-1 h-full overflow-hidden">
            {activeSubModule === "forecast" ? <ForecastPipelineView /> : <ActivityReportView />}
        </div>
    );
};
