"use client";

import React from "react";
import { ActivityReportView } from "./activity/ActivityReportView";

interface CommercialActivityModuleProps {
    /** "activity" — único sub-módulo activo por ahora, ver nota abajo */
    activeSubModule: string;
}

/**
 * Módulo Commercial Activity.
 *
 * Integra 1:1 el repo homesi-reporte-actividad (compartido por Heather)
 * como un módulo nativo de simoOS, sin alterar su lógica de negocio —
 * ver /lib/commercial-activity/* para el código portado.
 *
 * "Forecast" queda deliberadamente FUERA de este merge (2026-07-31):
 * el repo original calcula todo en memoria del navegador y no persiste
 * snapshots reales; se va a integrar aparte cuando se decida el enfoque
 * definitivo (persistencia real vs. cálculo en cliente). El código ya
 * portado sigue disponible en ./forecast/ForecastPipelineView.tsx para
 * cuando se retome — ver docs/AGENT_CONTEXT_ANTIGRAVITY.md.
 */
export const CommercialActivityModule: React.FC<CommercialActivityModuleProps> = () => {
    return (
        <div className="flex-1 h-full overflow-hidden">
            <ActivityReportView />
        </div>
    );
};
