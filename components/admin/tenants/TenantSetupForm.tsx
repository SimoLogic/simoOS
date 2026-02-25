"use client";

import React, { useState, useEffect } from "react";
import {
    X, Save, Building2, MapPin, DollarSign, Users, UserCheck,
    Plus, Trash2, AlertCircle, CheckCircle2, Info, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tenant, TenantPOC, TenantAM, blankPOC, blankTenant,
    REPORTING_CURRENCIES, AM_ROLES, POC_ROLES, COUNTRIES, AMRole,
} from "@/lib/tenant-types";
import { addTenant, generateTCODE } from "@/lib/tenant-store";
import { getEmployees } from "@/lib/hr-store";
import { FullEmployeeRecord } from "@/lib/hr-types";

// ─── Shared field styles ──────────────────────────────────────────────────────

const inputCls = (error?: string) =>
    cn(
        "w-full px-3 py-2 text-sm border rounded-lg bg-white transition-all outline-none",
        "focus:ring-2 focus:ring-cobalt-blue/25 focus:border-cobalt-blue",
        error ? "border-action-red/60 bg-red-50/30" : "border-slate-200 hover:border-slate-300"
    );

const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

interface FieldProps {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    className?: string;
}

const Field: React.FC<FieldProps> = ({ label, required, error, children, className }) => (
    <div className={cn("flex flex-col gap-1", className)}>
        <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            {label}
            {required && <span className="text-action-red text-[10px]">*</span>}
        </label>
        {children}
        {error && (
            <p className="flex items-center gap-1 text-[11px] text-action-red">
                <AlertCircle className="w-3 h-3" /> {error}
            </p>
        )}
    </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string; color?: string }> = ({
    icon: Icon, title, subtitle, color = "text-cobalt-blue",
}) => (
    <div className="flex items-center gap-3 mb-5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-current/10", color)}>
            <Icon className={cn("w-4 h-4", color)} />
        </div>
        <div>
            <h3 className="text-sm font-bold text-navy-blue">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
    </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = Omit<Tenant, "tenant_id" | "created_at">;
type Errors = Record<string, string>;

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(data: FormData): Errors {
    const e: Errors = {};
    if (!data.dba_name.trim()) e.dba_name = "DBA Name is required";
    if (!data.hq_address.country) e.country = "Required";
    if (!data.hq_address.city.trim()) e.city = "Required";
    if (!data.reporting_currency) e.reporting_currency = "Required";
    data.pocs.forEach((poc, i) => {
        if (poc.first_name || poc.last_name || poc.corporate_email) {
            if (!poc.first_name.trim()) e[`poc_${i}_first_name`] = "Required";
            if (!poc.last_name.trim()) e[`poc_${i}_last_name`] = "Required";
            if (poc.corporate_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(poc.corporate_email))
                e[`poc_${i}_corporate_email`] = "Invalid email";
        }
    });
    return e;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TenantSetupFormProps {
    onClose: () => void;
    onSaved: () => void;
}

export const TenantSetupForm: React.FC<TenantSetupFormProps> = ({ onClose, onSaved }) => {
    const [form, setForm] = useState<FormData>(blankTenant());
    const [errors, setErrors] = useState<Errors>({});
    const [saved, setSaved] = useState(false);
    const [savedTcode, setSavedTcode] = useState("");
    const [employees, setEmployees] = useState<FullEmployeeRecord[]>([]);

    useEffect(() => {
        const fetch = async () => {
            // Internal HOMESI tenant used for picking account managers
            const data = await getEmployees("HOM-CO-01");
            setEmployees(data);
        };
        fetch();
    }, []);

    const set = (key: keyof FormData, value: unknown) =>
        setForm((f) => ({ ...f, [key]: value }));

    const setAddress = (key: keyof FormData["hq_address"], value: string) =>
        setForm((f) => ({ ...f, hq_address: { ...f.hq_address, [key]: value } }));

    // ── POC Handlers ──────────────────────────────────────────────────────────

    const addPOC = () => {
        if (form.pocs.length >= 10) return;
        setForm((f) => ({ ...f, pocs: [...f.pocs, blankPOC()] }));
    };

    const removePOC = (index: number) =>
        setForm((f) => ({ ...f, pocs: f.pocs.filter((_, i) => i !== index) }));

    const setPOC = (index: number, key: keyof TenantPOC, value: string) =>
        setForm((f) => {
            const pocs = [...f.pocs];
            pocs[index] = { ...pocs[index], [key]: value };
            return { ...f, pocs };
        });

    // ── AM Handlers ───────────────────────────────────────────────────────────

    const toggleAM = (eid: string, name: string) => {
        const existing = form.account_managers.find((am) => am.employee_eid === eid);
        if (existing) {
            setForm((f) => ({ ...f, account_managers: f.account_managers.filter((am) => am.employee_eid !== eid) }));
        } else {
            setForm((f) => ({
                ...f,
                account_managers: [
                    ...f.account_managers,
                    { employee_eid: eid, employee_name: name, am_role: "General" },
                ],
            }));
        }
    };

    const setAMRole = (eid: string, role: AMRole) =>
        setForm((f) => ({
            ...f,
            account_managers: f.account_managers.map((am) =>
                am.employee_eid === eid ? { ...am, am_role: role } : am
            ),
        }));

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        const errs = validate(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        const tenant_id = await generateTCODE();
        const tenant: Tenant = {
            ...form,
            tenant_id,
            created_at: new Date().toISOString(),
            // Filter out empty POC rows
            pocs: form.pocs.filter((p) => p.first_name || p.last_name || p.corporate_email),
        };
        await addTenant(tenant);
        setSavedTcode(tenant_id);
        setSaved(true);
        setTimeout(() => {
            onSaved();
            onClose();
        }, 2000);
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cobalt-blue/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-cobalt-blue" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-navy-blue">New Tenant Setup</h2>
                        <p className="text-xs text-slate-400">Configure a new client tenant for HOMESI OS</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tenant {savedTcode} Created!
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                {/* ── Section 1: Legal Identity ─────────────────────────── */}
                <section>
                    <SectionHeader icon={Building2} title="Legal Identity" subtitle="Official registration details of the client entity" />
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Legal Name">
                            <input
                                type="text"
                                value={form.legal_name}
                                onChange={(e) => set("legal_name", e.target.value)}
                                className={inputCls()}
                                placeholder="e.g. Acme Mortgage Corp. LLC"
                            />
                        </Field>
                        <Field label="DBA Name (Doing Business As)" required error={errors.dba_name}>
                            <input
                                type="text"
                                value={form.dba_name}
                                onChange={(e) => set("dba_name", e.target.value)}
                                className={inputCls(errors.dba_name)}
                                placeholder="e.g. AcmeMortgage"
                            />
                        </Field>
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                {/* ── Section 2: HQ Address ─────────────────────────────── */}
                <section>
                    <SectionHeader icon={MapPin} title="Headquarters Address" subtitle="Primary office location of the client" color="text-violet-600" />
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Country" required error={errors.country}>
                            <select
                                value={form.hq_address.country}
                                onChange={(e) => setAddress("country", e.target.value)}
                                className={cn(inputCls(errors.country), "cursor-pointer")}
                            >
                                <option value="">— Select country —</option>
                                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="State / Province">
                            <input
                                type="text"
                                value={form.hq_address.state}
                                onChange={(e) => setAddress("state", e.target.value)}
                                className={inputCls()}
                                placeholder="e.g. California"
                            />
                        </Field>
                        <Field label="City" required error={errors.city}>
                            <input
                                type="text"
                                value={form.hq_address.city}
                                onChange={(e) => setAddress("city", e.target.value)}
                                className={inputCls(errors.city)}
                                placeholder="e.g. Los Angeles"
                            />
                        </Field>
                        <Field label="Street Address">
                            <input
                                type="text"
                                value={form.hq_address.street_address}
                                onChange={(e) => setAddress("street_address", e.target.value)}
                                className={inputCls()}
                                placeholder="e.g. 1234 Wilshire Blvd, Suite 500"
                            />
                        </Field>
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                {/* ── Section 3: Reporting Currency ─────────────────────── */}
                <section>
                    <SectionHeader icon={DollarSign} title="Reporting Currency" subtitle="Currency used for financial reports and invoicing" color="text-amber-600" />
                    <div className="grid grid-cols-3 gap-3">
                        {REPORTING_CURRENCIES.map((c) => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => set("reporting_currency", c.value)}
                                className={cn(
                                    "px-4 py-3 rounded-xl border-2 text-left transition-all",
                                    form.reporting_currency === c.value
                                        ? "border-cobalt-blue bg-cobalt-blue/5 text-navy-blue"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                )}
                            >
                                <p className="text-lg font-bold leading-none mb-1">{c.value}</p>
                                <p className="text-[11px] text-slate-400">{c.label.split("–")[1]?.trim()}</p>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                {/* ── Section 4: Points of Contact ──────────────────────── */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <SectionHeader
                            icon={Users}
                            title="Points of Contact"
                            subtitle={`Client contacts (up to 10). ${form.pocs.length}/10 added.`}
                            color="text-emerald-600"
                        />
                        {form.pocs.length < 10 && (
                            <button
                                type="button"
                                onClick={addPOC}
                                className="flex items-center gap-1.5 text-xs font-semibold text-cobalt-blue bg-cobalt-blue/8 hover:bg-cobalt-blue/15 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Contact
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {form.pocs.map((poc, i) => (
                            <div key={poc.id} className="relative bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Contact {i + 1}</span>
                                    {form.pocs.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removePOC(i)}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-action-red hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="First Name" required={!!(poc.last_name || poc.corporate_email)} error={errors[`poc_${i}_first_name`]}>
                                        <input type="text" value={poc.first_name}
                                            onChange={(e) => setPOC(i, "first_name", e.target.value)}
                                            className={inputCls(errors[`poc_${i}_first_name`])} placeholder="First" />
                                    </Field>
                                    <Field label="Last Name" error={errors[`poc_${i}_last_name`]}>
                                        <input type="text" value={poc.last_name}
                                            onChange={(e) => setPOC(i, "last_name", e.target.value)}
                                            className={inputCls(errors[`poc_${i}_last_name`])} placeholder="Last" />
                                    </Field>
                                    <Field label="Phone">
                                        <input type="tel" value={poc.phone}
                                            onChange={(e) => setPOC(i, "phone", e.target.value)}
                                            className={inputCls()} placeholder="+1 (555) 000-0000" />
                                    </Field>
                                    <Field label="Corporate Email" error={errors[`poc_${i}_corporate_email`]} className="col-span-2">
                                        <input type="email" value={poc.corporate_email}
                                            onChange={(e) => setPOC(i, "corporate_email", e.target.value)}
                                            className={inputCls(errors[`poc_${i}_corporate_email`])} placeholder="contact@client.com" />
                                    </Field>
                                    <Field label="Role">
                                        <select value={poc.role}
                                            onChange={(e) => setPOC(i, "role", e.target.value)}
                                            className={cn(inputCls(), "cursor-pointer")}>
                                            <option value="">— Role —</option>
                                            {POC_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                {/* ── Section 5: Account Managers ───────────────────────── */}
                <section>
                    <SectionHeader
                        icon={UserCheck}
                        title="Account Managers"
                        subtitle="Assign HOMESI employees as AMs for this tenant (optional)"
                        color="text-navy-blue"
                    />

                    {employees.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl px-5 py-6 text-center">
                            <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400 font-medium">No employees found</p>
                            <p className="text-xs text-slate-400 mt-1">Create employees via HR → Employee Intake first, then assign them as AMs.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {employees.map((emp) => {
                                const fullName = [emp.maestro.primer_nombre, emp.maestro.primer_apellido].filter(Boolean).join(" ");
                                const isSelected = form.account_managers.some((am) => am.employee_eid === emp.eid);
                                const selectedAM = form.account_managers.find((am) => am.employee_eid === emp.eid);
                                return (
                                    <div
                                        key={emp.eid}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                            isSelected ? "border-cobalt-blue bg-cobalt-blue/5" : "border-slate-100 hover:border-slate-200 bg-slate-50"
                                        )}
                                        onClick={() => toggleAM(emp.eid, fullName)}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "border-cobalt-blue bg-cobalt-blue" : "border-slate-300"
                                        )}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{fullName}</p>
                                            <p className="text-xs text-slate-400 font-mono">{emp.eid}</p>
                                        </div>
                                        {isSelected && (
                                            <select
                                                value={selectedAM?.am_role || "General"}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setAMRole(emp.eid, e.target.value as AMRole)}
                                                className="text-xs border border-cobalt-blue/30 rounded-lg px-2 py-1 bg-white text-cobalt-blue focus:outline-none cursor-pointer"
                                            >
                                                {AM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Validation summary */}
                {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-action-red/20 rounded-xl px-4 py-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-action-red mt-0.5 shrink-0" />
                        <p className="text-xs text-action-red font-medium">
                            Please fix the validation errors above before saving.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>A TCODE (e.g. TNT-001) will be auto-assigned on save.</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saved}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-navy-blue hover:bg-cobalt-blue rounded-lg transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};
