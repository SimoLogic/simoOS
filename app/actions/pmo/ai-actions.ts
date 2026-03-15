"use server";

import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates an executive summary of project progress based on activity logs.
 */
export async function getProjectSummaryAction(orgId: string, boardId: string) {
    try {
        const db = getPmoDB();
        
        // 1. Fetch recent activity logs for this board
        // In a real scenario, we'd join with pmo_tasks to filter by boardId 
        // since logs might not have boardId directly. For v1, we fetch all org logs.
        const { data: logs, error } = await db
            .from("pmo_activity_logs")
            .select(`
                id, 
                action_type, 
                new_value, 
                created_at,
                pmo_tasks!inner(title, board_id)
            `)
            .eq("org_id", orgId)
            .eq("pmo_tasks.board_id", boardId)
            .order("created_at", { ascending: false })
            .limit(50);

        throwIfDbError(error, "fetchLogsForAI");

        if (!logs || logs.length === 0) {
            return { success: true, summary: "No hay actividad reciente suficiente para generar un resumen." };
        }

        // 2. Format logs for the AI
        const logContext = (logs as any[]).map(l => {
            const task = Array.isArray(l.pmo_tasks) ? l.pmo_tasks[0] : l.pmo_tasks;
            return `[${l.created_at}] Accion: ${l.action_type} en Tarea: "${task?.title || 'Unknown'}". Data: ${l.new_value}`;
        }).join("\n");

        // 3. Call Gemini
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) throw new Error("Google AI Key not configured");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Eres un Gerente de Proyectos experto en SIMO Intellisense.
            A continuación se presenta un log de actividad reciente de un tablero de gestión.
            Tu tarea es generar un RESUMEN EJECUTIVO (Executive Summary) profesional y conciso.
            
            Reglas:
            1. Usa un tono profesional y directo. 
            2. Resalta hitos completados y posibles cuellos de botella (bloqueos).
            3. Devuelve el resultado en Markdown con emojis sutiles.
            4. Máximo 4 párrafos cortos.
            5. Idioma: Español.

            LOGS DE ACTIVIDAD:
            ${logContext}
        `;

        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        return { success: true, summary };
    } catch (err: unknown) {
        console.error("[AI Action] getProjectSummary:", err);
        return { success: false, error: (err as Error).message };
    }
}
