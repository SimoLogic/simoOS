"use client";

import React, { useState, useEffect } from "react";
import { useTenant } from "@/lib/tenant-context";
import { getFxRatesAction, saveFxRateAction } from "@/app/actions/finance-actions";
import { FxRate } from "@/lib/finance-types";
import { AlertCircle, Calendar as CalendarIcon, DollarSign, MoveRight, Save, Loader2, ArrowRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";

export function FxManagerApp() {
    const { currentTenant } = useTenant();
    const tenantId = currentTenant?.tenant_id || "";
    const [rates, setRates] = useState<FxRate[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
    const [rateInput, setRateInput] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (tenantId) fetchRates();
    }, [tenantId]);

    const fetchRates = async () => {
        setLoading(true);
        const data = await getFxRatesAction(tenantId);
        setRates(data || []);
        setLoading(false);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        const dateStr = format(date, "yyyy-MM-dd");
        const existing = rates.find(r => r.effective_date === dateStr);
        setRateInput(existing ? existing.exchange_rate.toString() : "");
    };

    const handleSave = async () => {
        if (!rateInput || isNaN(Number(rateInput))) return;
        setSaving(true);
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        
        const existing = rates.find(r => r.effective_date === dateStr);
        const res = await saveFxRateAction({
            id: existing?.id,
            tenant_id: tenantId,
            effective_date: dateStr,
            exchange_rate: Number(rateInput),
            currency_from: "COP",
            currency_to: "USD" // Simplification: in prod derived from tenant
        });

        if (res.success) {
            await fetchRates();
            setRateInput("");
        } else {
            alert(`Error saving rate: ${res.error}`);
        }
        setSaving(false);
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const daysInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Check if a date has an exact mapped rate
    const hasRate = (date: Date) => {
        const str = format(date, "yyyy-MM-dd");
        return rates.some(r => r.effective_date === str);
    };

    // Find the active rate for a date (most recent prior or equal)
    const getActiveRateForDate = (date: Date) => {
        const str = format(date, "yyyy-MM-dd");
        const applicable = rates.filter(r => r.effective_date <= str).sort((a,b) => b.effective_date.localeCompare(a.effective_date));
        return applicable.length > 0 ? applicable[0].exchange_rate : null;
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-navy-blue flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-cobalt-blue" />
                            FX Exchange Rates Manager
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Set historical and current exchange rates for precise localized payroll and proforma reporting.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Col: Calendar */}
                    <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-navy-blue flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-slate-400" />
                                Interactive FX Calendar
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100"
                                >
                                    Prev
                                </button>
                                <div className="px-4 py-1.5 text-sm font-bold text-navy-blue bg-slate-50 border border-slate-200 rounded-md shrink-0 w-32 text-center">
                                    {format(currentMonth, "MMMM yyyy")}
                                </div>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {/* Empty days padding */}
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="p-2 select-none" />
                            ))}
                            
                            {/* Actual days */}
                            {daysInterval.map((day: any) => {
                                const isSel = isSameDay(day, selectedDate);
                                const isTod = isToday(day);
                                const exactRate = hasRate(day);
                                const activeRate = getActiveRateForDate(day);

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => handleDateSelect(day)}
                                        className={`
                                            aspect-square rounded-xl p-2 flex flex-col items-center justify-center relative transition-all border
                                            ${isSel ? 'border-cobalt-blue bg-blue-50/50 shadow-sm ring-1 ring-cobalt-blue' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                                            ${isTod && !isSel ? 'bg-slate-100 font-bold' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${isSel ? 'text-cobalt-blue' : 'text-slate-700'}`}>
                                            {format(day, "d")}
                                        </span>
                                        {/* Indicators */}
                                        <div className="mt-1 flex flex-col items-center gap-1">
                                            {exactRate ? (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Rate defined on this day" />
                                            ) : (
                                                 <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Exact record saved on date
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full border border-cobalt-blue" /> Selected
                             </div>
                        </div>
                    </div>

                    {/* Right Col: Input & History */}
                    <div className="space-y-6">
                        {/* Action Box */}
                        <div className="bg-white rounded-xl shadow-sm border border-cobalt-blue/20 p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-cobalt-blue"></div>
                            
                            <h3 className="text-sm font-semibold text-navy-blue mb-4">Set Effective Rate</h3>
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Date Selected</p>
                                <p className="text-lg font-medium text-slate-800">{format(selectedDate, "MMM do, yyyy")}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Exchange Rate (Local to USD)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-medium">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={rateInput}
                                            onChange={e => setRateInput(e.target.value)}
                                            placeholder="e.g. 4000.50"
                                            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cobalt-blue/50 focus:border-cobalt-blue transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2">
                                        Sets the conversion from this date <strong>forward</strong> until the next rate is found.
                                    </p>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={loading || saving || !rateInput}
                                    className="w-full bg-cobalt-blue hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save FX Rate
                                </button>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden flex flex-col h-[400px]">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-sm font-bold text-navy-blue">Historical Timeline</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loading && <div className="text-center text-xs text-slate-500 py-4">Loading rates...</div>}
                                {!loading && rates.length === 0 && (
                                    <div className="text-center py-6 text-slate-400 flex flex-col items-center">
                                        <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
                                        <p className="text-xs">No FX rates defined for this tenant.</p>
                                    </div>
                                )}
                                {rates.map((rate, i) => (
                                    <div key={rate.id} className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-cobalt-blue/30 hover:bg-blue-50/20 transition-all cursor-pointer" onClick={() => handleDateSelect(parseISO(rate.effective_date))}>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{format(parseISO(rate.effective_date), "MMM d, yyyy")}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                <span className="font-medium text-slate-400">{rate.currency_from}</span>
                                                <MoveRight className="w-3 h-3" />
                                                <span className="font-medium text-slate-400">{rate.currency_to}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-600">${rate.exchange_rate.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rate</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
