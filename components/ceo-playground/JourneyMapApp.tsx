"use client";

import React, { useState } from "react";
import { Link as LinkIcon, CheckCircle2 } from "lucide-react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

// ─── Data Store ───────────────────────────────────────────────────────────────

const moments = [
    {
        moment: "M1: Generación y Captación",
        stage: "1. Discovery",
        category: "MARKETING",
        jtbdType: "Emocional",
        jtbdName: "Marketing Estratégico (#5)",
        pain: "P: Soledad estratégica y falta de planes locales agresivos.",
        gain: "G: Partner de negocio que diseñe el mercado con él.",
        score: 2,
        emoji: "☹️",
        justification: "Francisco es un ex-CMO. Percibe el soporte como puramente operativo ('Angela hace flyers'). No estamos ofreciendo valor al nivel de su seniority, lo que incrementa su sensación de soledad estratégica.",
        hint: "Ejecución operativa; falta visión de par estratégico.",
    },
    {
        moment: "M8: Consolidación de Autoridad",
        stage: "2. Envolvimiento",
        category: "MARKETING",
        jtbdType: "Social",
        jtbdName: "Optimización RRSS (#10)",
        pain: "P: Ser percibido como un 'commodity' hipotecario más.",
        gain: "G: Posicionamiento como líder de opinión y gurú local.",
        score: 2,
        emoji: "☹️",
        justification: "El contenido genérico infantiliza su marca ante su red de realtors élite. No se cumple el gain de estatus; se percibe como algo cosmético que daña su capital social acumulado.",
        hint: "Contenido genérico erosiona capital social.",
    },
    {
        moment: "M6: Validación de Resultados",
        stage: "3. Prueba / 6. Flywheel",
        category: "GROWTH",
        jtbdType: "Funcional",
        jtbdName: "Fractional CFO (#12)",
        pain: "P: Oscuridad en la rentabilidad real de la branch.",
        gain: "G: Certeza financiera y visión prospectiva de CEO.",
        score: 3,
        emoji: "😐",
        justification: "Estado: Indiferente. El servicio se volvió rutinario. Cumple la función técnica de identificar errores, pero no cura el dolor de 'brújula futura'. Se espera un socio estratégico, no un contador.",
        hint: "Reporte reactivo; falta análisis prospectivo.",
    },
    {
        moment: "M3: Configuración Ecosistema",
        stage: "4. Setup",
        category: "OFFSHORE",
        jtbdType: "Funcional",
        jtbdName: "Hiring / Management (#1)",
        pain: "P: Orfandad administrativa del personal remoto.",
        gain: "G: Estructura de costos eficiente y autónoma.",
        score: 2,
        emoji: "☹️",
        justification: "HOMESI hace el hiring, pero la branch (Stephanie) asume el management real. El dolor de micro-gestión no se cura. El valor percibido es bajo porque el BM trabaja para la administración, no al revés.",
        hint: "Management inexistente; BM absorbe la gestión.",
    },
    {
        moment: "M2: Cierre y Delivery",
        stage: "6. Flywheel",
        category: "PRODUCTION",
        jtbdType: "Funcional",
        jtbdName: "Pipeline Management (#14)",
        pain: "P: Cuellos de botella y miedo a quedar mal con realtors.",
        gain: "G: Cierres impecables que blinden su reputación.",
        score: 2,
        emoji: "☹️",
        justification: "Sistema reactivo. Francisco debe 'empujar' casos manualmente. El gain de 'paz mental' no se cumple. El impacto negativo en la confianza es alto ante retrasos técnicos.",
        hint: "BM debe intervenir para desatascar casos.",
    },
    {
        moment: "M5: Optimización del Flujo",
        stage: "6. Flywheel",
        category: "GROWTH",
        jtbdType: "Social",
        jtbdName: "NPPM Playbook (#3)",
        pain: "P: Depender del tiempo propio para escalar la red.",
        gain: "G: Red legal masiva de aliados inmobiliarios.",
        score: 4,
        emoji: "🙂",
        justification: "Es la gran apuesta de Francisco. Se cumple el gain de escala legal. Es el punto más alto de valor percibido, aunque condicionado a la ejecución divisional final.",
        hint: "Valorado por potencial de escala y legalidad.",
    },
    {
        moment: "M9: Liderazgo Transversal",
        stage: "7. Lealtad",
        category: "ESTRATEGIA",
        jtbdType: "Social",
        jtbdName: "Managing Partner Council",
        pain: "P: Sentirse 'uno más'; talento senior desperdiciado.",
        gain: "G: Poder de co-diseño e influencia en la División.",
        score: 1,
        emoji: "😡",
        justification: "Brecha crítica total. El mayor dolor de Francisco (deseo de influencia directiva) es ignorado por el catálogo actual. Esta orfandad de estatus es la causa raíz del rating de dependencia 1/10.",
        hint: "Vacío absoluto; talento senior ignorado.",
    },
];

// ─── Chart Data ────────────────────────────────────────────────────────────────

const radarData = [
    { dimension: "Marketing", score: 2 },
    { dimension: "Growth", score: 3.5 },
    { dimension: "Offshore", score: 2 },
    { dimension: "Production", score: 2 },
    { dimension: "Estrategia", score: 1 },
];

const barData = [
    { name: "Mkt Estrat.", meta: 5, real: 2 },
    { name: "CFO Frac.", meta: 5, real: 3 },
    { name: "NPPM Play", meta: 5, real: 4 },
    { name: "Hiring", meta: 4, real: 2 },
    { name: "Liderazgo", meta: 5, real: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPillClass = (type: string) => {
    const t = type.toLowerCase().substring(0, 3);
    if (t === "fun") return "bg-green-100 text-green-800";
    if (t === "emo") return "bg-yellow-100 text-yellow-800";
    if (t === "soc") return "bg-blue-100 text-blue-800";
    return "bg-slate-100 text-slate-800";
};

// ─── Component ────────────────────────────────────────────────────────────────

export const JourneyMapApp = () => {
    const [showAlert, setShowAlert] = useState(false);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 3000);
        }).catch(() => {
            alert("Error al copiar link. Por favor, copie la URL manualmente.");
        });
    };

    return (
        // Fix #3: overflow-y-auto allows internal scroll within the SPA dashboard container
        <div className="w-full h-full overflow-y-auto bg-[#fdfdfd] text-slate-900">
            <style dangerouslySetInnerHTML={{ __html: `
                .jm-analysis-block {
                    border-left: 2px solid #e2e8f0;
                    padding-left: 1rem;
                    transition: border-color 0.3s ease;
                }
                .jm-analysis-block:hover { border-left-color: #4f46e5; }
                .jm-card-shadow { box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }
                .jm-pill {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 9999px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .jm-hint {
                    font-size: 0.65rem;
                    line-height: 1.1;
                    color: #64748b;
                    margin-top: 4px;
                    display: block;
                }
            `}} />

            {/* ── Inner Nav ── */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 px-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏛️</span>
                        <span className="font-bold text-base tracking-tight text-slate-900">
                            HOMESI <span className="text-indigo-600">ORCHESTRATOR</span>
                        </span>
                    </div>
                    <div className="flex gap-4 text-sm font-semibold text-slate-500 items-center">
                        <button onClick={() => scrollToSection("jm-analisis")} className="hover:text-indigo-600 transition-colors text-xs">Análisis</button>
                        <button onClick={() => scrollToSection("jm-visual")} className="hover:text-indigo-600 transition-colors text-xs">Métricas</button>
                        <button onClick={() => scrollToSection("jm-matriz")} className="hover:text-indigo-600 transition-colors text-xs">Matriz</button>
                        <button
                            onClick={copyShareLink}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-all"
                        >
                            <LinkIcon size={12} /> Compartir Link
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Toast ── */}
            {showAlert && (
                <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-4">
                    <CheckCircle2 className="text-emerald-400" size={16} />
                    <span className="text-sm font-medium">Link copiado al portapapeles</span>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-6 py-10 space-y-20">

                {/* ── Header: Perfil Francisco ── */}
                <header className="flex flex-col md:flex-row gap-10 items-start justify-between">
                    <div className="max-w-2xl space-y-3">
                        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Persona #1A — Branch Owner Elite
                        </div>
                        <h1 className="text-5xl font-extrabold tracking-tighter text-slate-900 leading-[1.1]">
                            Francisco
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed font-medium">
                            "El Soberano": Un empresario con pasado directivo que busca recuperar el control
                            estratégico. Su lealtad está condicionada a ser reconocido como un arquitecto de
                            la plataforma, no como un operario del sistema.
                        </p>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[36px] text-white shadow-2xl flex flex-col justify-between min-w-[260px] shrink-0">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Índice de Retención</p>
                            <div className="text-6xl font-black italic">
                                30<span className="text-2xl text-slate-500">%</span>
                            </div>
                        </div>
                        <div className="mt-8 space-y-2">
                            <div className="w-full bg-slate-800 h-1.5 rounded-full">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: "30%" }} />
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Estado: Riesgo de Fuga Crítico</p>
                        </div>
                    </div>
                </header>

                {/* ── Sección I: Cards de Momentos ── */}
                <section id="jm-analisis" className="space-y-8">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-bold mb-3">I. Análisis Detallado de Momentos</h2>
                        <p className="text-slate-600 leading-relaxed italic text-sm">
                            Este desglose cualitativo evalúa si HOMESI está curando dolores reales o simplemente
                            entregando procesos administrativos. Cada momento se clasifica por su naturaleza
                            (Funcional, Emocional, Social) para identificar dónde se rompe la lealtad.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {moments.map((m, idx) => (
                            <div key={idx} className="jm-analysis-block bg-white p-5 rounded-2xl border border-slate-100 jm-card-shadow space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.stage}</span>
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{m.jtbdName}</h4>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl">{m.emoji}</span>
                                        <div className="text-[10px] font-black text-slate-900">{m.score}/5</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`jm-pill ${getPillClass(m.jtbdType)}`}>{m.jtbdType}</span>
                                    <span className="jm-pill bg-slate-100 text-slate-500">{m.category}</span>
                                </div>
                                <div className="space-y-1.5 text-xs leading-relaxed border-t border-slate-50 pt-3">
                                    <p className="text-rose-700"><strong>{m.pain.split(":")[0]}:</strong> {m.pain.split(":")[1]}</p>
                                    <p className="text-emerald-700"><strong>{m.gain.split(":")[0]}:</strong> {m.gain.split(":")[1]}</p>
                                </div>
                                <div className="pt-2 border-t border-slate-50">
                                    <p className="text-[11px] text-slate-500 italic">
                                        <strong>Análisis CMO:</strong> {m.justification}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Sección II: Charts con Recharts (SSR-safe) ── */}
                <section id="jm-visual" className="space-y-8">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-bold mb-3">II. Sustentación Gráfica del Performance</h2>
                        <p className="text-slate-600 leading-relaxed italic text-sm">
                            Visualización cuantitativa del riesgo de fuga. La brecha entre lo que HOMESI marca
                            como "Crítico" y la satisfacción real del BM indica una falla sistémica en la
                            entrega de valor estratégico.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Radar Chart */}
                        <div className="bg-white p-7 rounded-3xl border border-slate-100 jm-card-shadow">
                            <h3 className="text-center font-bold text-slate-800 mb-5 uppercase text-xs tracking-widest">
                                Dimensiones de Valor Percibido
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                                    <Radar
                                        name="Satisfacción Francisco"
                                        dataKey="score"
                                        stroke="#4f46e5"
                                        fill="#4f46e5"
                                        fillOpacity={0.2}
                                        strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white p-7 rounded-3xl border border-slate-100 jm-card-shadow">
                            <h3 className="text-center font-bold text-slate-800 mb-5 uppercase text-xs tracking-widest">
                                Criticidad vs. Satisfacción
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barData} barCategoryGap="30%" barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11 }}
                                        cursor={{ fill: "#f8fafc" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
                                    <Bar dataKey="meta" name="Criticidad Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="real" name="Satisfacción Real" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                {/* ── Sección III: Matriz JTBD ── */}
                <section id="jm-matriz" className="space-y-8">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-bold mb-3">III. Matriz de Jornada Interactiva</h2>
                        <p className="text-slate-600 leading-relaxed italic text-sm">
                            Auditoría técnica de la relación. Los hints descriptivos en cada celda justifican
                            el nivel de impacto de 1 a 5, permitiendo un diagnóstico rápido de los cuellos de
                            botella operativos.
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                                    <th className="px-6 py-5">Categoría / Servicio</th>
                                    <th className="px-6 py-5">Impacto JTBD</th>
                                    <th className="px-6 py-5">Pain (P) / Gain (G)</th>
                                    <th className="px-6 py-5 text-center">Score 1–5</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {moments.map((m, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5 align-top">
                                            <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">{m.category}</div>
                                            <div className="font-bold text-slate-800 text-sm">{m.jtbdName}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{m.moment}</div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <span className={`jm-pill ${getPillClass(m.jtbdType)}`}>{m.jtbdType}</span>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="text-[11px] text-slate-700 space-y-1">
                                                <p><span className="font-bold text-rose-500">P:</span> {m.pain.split(":")[1]}</p>
                                                <p><span className="font-bold text-emerald-500">G:</span> {m.gain.split(":")[1]}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top text-center">
                                            <div className="text-xl">{m.emoji}</div>
                                            <div className="text-xs font-black text-slate-900">{m.score}</div>
                                            <span className="jm-hint">{m.hint}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ERIC Synthesis */}
                    <div className="grid md:grid-cols-4 gap-5 pt-4">
                        <div className="p-5 bg-rose-50 border-t-4 border-rose-500 rounded-2xl">
                            <div className="font-black text-rose-600 mb-2 uppercase text-xs">ELIMINAR</div>
                            <p className="text-xs text-rose-800 italic leading-relaxed">Campañas masivas genéricas. Erosionan la marca personal del BM.</p>
                        </div>
                        <div className="p-5 bg-amber-50 border-t-4 border-amber-500 rounded-2xl">
                            <div className="font-black text-amber-600 mb-2 uppercase text-xs">REDUCIR</div>
                            <p className="text-xs text-amber-800 italic leading-relaxed">Gestión operativa del BM en el offshore. Automatizar supervisión.</p>
                        </div>
                        <div className="p-5 bg-indigo-50 border-t-4 border-indigo-500 rounded-2xl">
                            <div className="font-black text-indigo-600 mb-2 uppercase text-xs">INCREMENTAR</div>
                            <p className="text-xs text-indigo-800 italic leading-relaxed">Seniority del CFO. Evolucionar de reporte contable a Board de negocios.</p>
                        </div>
                        <div className="p-5 bg-emerald-50 border-t-4 border-emerald-500 rounded-2xl">
                            <div className="font-black text-emerald-600 mb-2 uppercase text-xs">CREAR</div>
                            <p className="text-xs text-emerald-800 italic leading-relaxed">Managing Partner Council. Rol de influencia formal en el diseño del OS.</p>
                        </div>
                    </div>
                </section>

            </main>

            <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-slate-100 text-center text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">
                Confidencial · HOMESI Division · CMO Agéntico Analytics · v7.0
            </footer>
        </div>
    );
};
