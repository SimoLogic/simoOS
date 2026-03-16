"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    X, Save, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
    User, Briefcase, Shield, HeartPulse, FileCheck,
    Info, Asterisk, Eye, EyeOff, Building2, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/lib/tenant-context";
import { getActiveTenants } from "@/lib/tenant-store";
import {
    EmpleadoMaestro, HistorialLaboral, EmpleadoAfiliaciones, EmpleadoSST,
    FullEmployeeRecord, LocalLegalEntity,
    blankMaestro, blankHistorial, blankAfiliaciones, blankSST,
    TIPOS_DOCUMENTO, TIPOS_CONTRATO, TIPOS_SALARIO,
    EPS_OPTIONS, AFP_OPTIONS, ARL_OPTIONS, CCF_OPTIONS,
    SUBTIPO_COTIZANTE_OPTIONS, ENTIDADES_LEGALES, MUNICIPIOS_DANE,
    AREAS_EMPRESA, SUB_AREAS,
} from "@/lib/hr-types";
import { getLocalLegalEntitiesAction } from "@/app/actions/legal-entity-actions";
import { getActiveBranchesAction } from "@/app/actions/branch-actions";
import { getActiveJobTitlesAction } from "@/app/actions/job-title-actions";
import { getContinentsAction, getCountriesAction, getCitiesAction } from "@/app/actions/geography-actions";
import type { Branch } from "@/lib/branch-types";
import type { JobTitleRef, RoleTitleRef } from "@/lib/job-title-types";


// ─── Helpers ──────────────────────────────────────────────────────────────────

const genEID = () => `EID-${String(Math.floor(Math.random() * 9000) + 1000)}`;

const today = () => new Date().toISOString().split("T")[0];

// ─── Form Field Components ────────────────────────────────────────────────────

interface FieldProps {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

const Field: React.FC<FieldProps> = ({ label, required, error, hint, children, className }) => (
    <div className={cn("flex flex-col gap-1", className)}>
        <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            {label}
            {required && <span className="text-action-red text-[10px]">*</span>}
        </label>
        {children}
        {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
        {error && (
            <p className="flex items-center gap-1 text-[11px] text-action-red">
                <AlertCircle className="w-3 h-3" /> {error}
            </p>
        )}
    </div>
);

const inputCls = (error?: string) =>
    cn(
        "w-full px-3 py-2 text-sm border rounded-lg bg-white transition-all outline-none",
        "focus:ring-2 focus:ring-cobalt-blue/25 focus:border-cobalt-blue",
        error ? "border-action-red/60 bg-red-50/30" : "border-slate-200 hover:border-slate-300"
    );

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
    placeholder?: string;
    options: { value: string | number; label: string }[];
}

const Select: React.FC<SelectProps> = ({ error, placeholder, options, ...props }) => (
    <select {...props} className={cn(inputCls(error), "cursor-pointer")}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
            <option key={String(o.value)} value={o.value}>{o.label}</option>
        ))}
    </select>
);

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: "Personal Info", icon: User, table: "M1 – empleados_maestro", color: "text-cobalt-blue", bg: "bg-cobalt-blue" },
    { id: 2, label: "Job & Contract", icon: Briefcase, table: "M2/M4 – historial_laboral", color: "text-violet-600", bg: "bg-violet-500" },
    { id: 3, label: "Social Security", icon: Shield, table: "M3 – empleados_afiliaciones", color: "text-amber-600", bg: "bg-amber-500" },
    { id: 4, label: "SST & Emergency", icon: HeartPulse, table: "M5 – empleados_sst", color: "text-emerald-600", bg: "bg-emerald-500" },
    { id: 5, label: "Review & Save", icon: FileCheck, table: "HC Master", color: "text-navy-blue", bg: "bg-navy-blue" },
];

// ─── Validation ───────────────────────────────────────────────────────────────

type Errors = Record<string, string>;

function validateStep1(d: ReturnType<typeof blankMaestro>): Errors {
    const e: Errors = {};
    if (!d.numero_identificacion.trim()) e.numero_identificacion = "Required";
    if (!d.tipo_documento_id) e.tipo_documento_id = "Required";
    if (!d.primer_nombre.trim()) e.primer_nombre = "Required";
    if (!d.primer_apellido.trim()) e.primer_apellido = "Required";
    if (!d.segundo_apellido.trim()) e.segundo_apellido = "Required";
    if (!d.fecha_nacimiento) e.fecha_nacimiento = "Required";
    if (!d.genero) e.genero = "Required";
    if (!d.email_personal.trim()) e.email_personal = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email_personal)) e.email_personal = "Invalid email";
    if (!d.municipio_dane) e.municipio_dane = "Required";
    if (!d.direccion_residencia.trim()) e.direccion_residencia = "Required";
    return e;
}

function validateStep2(d: ReturnType<typeof blankHistorial>): Errors {
    const e: Errors = {};
    if (!d.fecha_inicio) e.fecha_inicio = "Required";
    if (!d.tipo_contrato) e.tipo_contrato = "Required";
    if (!d.tipo_salario) e.tipo_salario = "Required";
    if (!d.entidad_legal) e.entidad_legal = "Required";
    if (!d.salario_base || d.salario_base <= 0) e.salario_base = "Must be > 0";
    if (!d.area) e.area = "Required";
    if (!d.sub_area) e.sub_area = "Required";
    if (!d.centro_costo.trim()) e.centro_costo = "Required";
    if (!d.direct_leader.trim()) e.direct_leader = "Required";
    if (d.digito_dedicacion < 1 || d.digito_dedicacion > 100) e.digito_dedicacion = "1–100%";
    return e;
}

function validateStep3(d: EmpleadoAfiliaciones): Errors {
    const e: Errors = {};
    if (!d.eps_id) e.eps_id = "Required";
    if (!d.afp_id) e.afp_id = "Required";
    if (!d.arl_id) e.arl_id = "Required";
    if (!d.ccf_id) e.ccf_id = "Required";
    if (!d.nivel_riesgo_arl) e.nivel_riesgo_arl = "Required";
    if (!d.subtipo_cotizante) e.subtipo_cotizante = "Required";
    return e;
}

function validateStep4(d: EmpleadoSST): Errors {
    const e: Errors = {};
    if (!d.talla_camisa) e.talla_camisa = "Required";
    if (!d.talla_pantalon) e.talla_pantalon = "Required";
    if (!d.talla_calzado || d.talla_calzado < 30) e.talla_calzado = "Required";
    if (!d.tipo_sangre) e.tipo_sangre = "Required";
    if (!d.contacto_emergencia.trim()) e.contacto_emergencia = "Required";
    if (!d.telefono_emergencia.trim()) e.telefono_emergencia = "Required";
    return e;
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

const Step1: React.FC<{
    data: ReturnType<typeof blankMaestro>;
    onChange: (d: ReturnType<typeof blankMaestro>) => void;
    errors: Errors;
    fotoUrl: string;
    onFotoChange: (url: string) => void;
}> = ({ data, onChange, errors, fotoUrl, onFotoChange }) => {
    const set = (k: keyof typeof data, v: string) => onChange({ ...data, [k]: v });
    const photoInputRef = React.useRef<HTMLInputElement>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onFotoChange(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Load Geography ──
    const [continents, setContinents] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    useEffect(() => {
        getContinentsAction().then(setContinents).catch(console.error);
    }, []);

    useEffect(() => {
        if (data.continent_id) getCountriesAction(data.continent_id).then(setCountries).catch(console.error);
        else setCountries([]);
    }, [data.continent_id]);

    useEffect(() => {
        if (data.country_id) getCitiesAction(data.country_id).then(setCities).catch(console.error);
        else setCities([]);
    }, [data.country_id]);

    return (
        <div className="space-y-6">
            {/* Photo Upload Section */}
            <div className="flex items-center gap-5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div
                    onClick={() => photoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-300 hover:border-cobalt-blue cursor-pointer transition-colors group flex-shrink-0"
                >
                    {fotoUrl ? (
                        <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 group-hover:bg-cobalt-blue/5">
                            <User className="w-8 h-8 text-slate-300 group-hover:text-cobalt-blue/40" />
                        </div>
                    )}
                    {fotoUrl && (
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[9px] text-white font-bold">Change</span>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-700">Employee Photo</p>
                        <span className="text-[9px] text-slate-400 uppercase font-bold border border-slate-200 px-1.5 py-0.5 rounded">Optional</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                        Supports JPG, JPEG, PNG, WEBP, GIF, BMP, SVG. Max 5MB. This photo is display-only and will not be included in Excel exports.
                    </p>
                    <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-xs font-semibold text-cobalt-blue border border-cobalt-blue/30 px-3 py-1.5 rounded-lg hover:bg-cobalt-blue/5 transition-colors"
                    >
                        {fotoUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {fotoUrl && (
                        <button
                            type="button"
                            onClick={() => onFotoChange("")}
                            className="ml-2 text-xs font-semibold text-action-red border border-action-red/20 px-3 py-1.5 rounded-lg hover:bg-action-red/5 transition-colors"
                        >
                            Remove
                        </button>
                    )}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
                        onChange={handlePhotoSelect}
                        hidden
                    />
                </div>
            </div>

            <div className="bg-cobalt-blue/5 border border-cobalt-blue/15 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-cobalt-blue mt-0.5 shrink-0" />
                <p className="text-xs text-cobalt-blue/80">
                    <strong>Table M1 – empleados_maestro.</strong> This data is immutable identity information. Changes after saving require a formal amendment process.
                </p>
            </div>

            {/* Document */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Document</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Document Type" required error={errors.tipo_documento_id}>
                        <Select
                            value={data.tipo_documento_id}
                            onChange={e => set("tipo_documento_id", e.target.value)}
                            error={errors.tipo_documento_id}
                            placeholder="— Select —"
                            options={TIPOS_DOCUMENTO.filter(t => t.value).map(t => ({ value: t.value, label: t.label }))}
                        />
                    </Field>
                    <Field label="ID Number" required error={errors.numero_identificacion}
                        hint="No dots or dashes (e.g. 1234567890)">
                        <input
                            type="text"
                            value={data.numero_identificacion}
                            onChange={e => set("numero_identificacion", e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                            className={inputCls(errors.numero_identificacion)}
                            placeholder="1234567890"
                            maxLength={20}
                        />
                    </Field>
                </div>
            </div>

            {/* Name */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Full Name</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" required error={errors.primer_nombre}>
                        <input type="text" value={data.primer_nombre}
                            onChange={e => set("primer_nombre", e.target.value)}
                            className={inputCls(errors.primer_nombre)} placeholder="e.g. Carlos" />
                    </Field>
                    <Field label="Middle Name(s)" error={errors.otros_nombres} hint="Optional">
                        <input type="text" value={data.otros_nombres}
                            onChange={e => set("otros_nombres", e.target.value)}
                            className={inputCls()} placeholder="e.g. Andrés" />
                    </Field>
                    <Field label="First Last Name" required error={errors.primer_apellido}>
                        <input type="text" value={data.primer_apellido}
                            onChange={e => set("primer_apellido", e.target.value)}
                            className={inputCls(errors.primer_apellido)} placeholder="e.g. Mendoza" />
                    </Field>
                    <Field label="Second Last Name" required error={errors.segundo_apellido}>
                        <input type="text" value={data.segundo_apellido}
                            onChange={e => set("segundo_apellido", e.target.value)}
                            className={inputCls(errors.segundo_apellido)} placeholder="e.g. Ruiz" />
                    </Field>
                </div>
            </div>

            {/* Demographics */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Demographics</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Date of Birth" required error={errors.fecha_nacimiento}
                        hint="Used for age validation and pension eligibility">
                        <input type="date" value={data.fecha_nacimiento}
                            onChange={e => set("fecha_nacimiento", e.target.value)}
                            max={today()}
                            className={inputCls(errors.fecha_nacimiento)} />
                    </Field>
                    <Field label="Gender" required error={errors.genero}
                        hint="Impacts pension weeks calculation">
                        <Select
                            value={data.genero}
                            onChange={e => set("genero", e.target.value)}
                            error={errors.genero}
                            placeholder="— Select —"
                            options={[
                                { value: "M", label: "Male (M)" },
                                { value: "F", label: "Female (F)" },
                                { value: "X", label: "Non-binary (X)" },
                            ]}
                        />
                    </Field>
                </div>
            </div>

            {/* Contact */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact & Residence</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Personal Email" required error={errors.email_personal}
                        hint="Used for DIAN electronic payroll delivery">
                        <input type="email" value={data.email_personal}
                            onChange={e => set("email_personal", e.target.value)}
                            className={inputCls(errors.email_personal)}
                            placeholder="employee@gmail.com" />
                    </Field>
                    <Field label="Municipality (DANE Code)" required error={errors.municipio_dane}
                        hint="5-digit DANE code – required for ARL">
                        <Select
                            value={data.municipio_dane}
                            onChange={e => set("municipio_dane", e.target.value)}
                            error={errors.municipio_dane}
                            placeholder="— Select city —"
                            options={MUNICIPIOS_DANE.map(m => ({ value: m.code, label: `${m.code} – ${m.name}` }))}
                        />
                    </Field>
                    <Field label="Continent" required error={errors.continent_id}>
                        <Select
                            value={data.continent_id || ""}
                            onChange={e => onChange({ ...data, continent_id: e.target.value, country_id: "", city_id: "" })}
                            placeholder="— Select —"
                            options={continents.map(c => ({ value: c.id, label: c.name }))}
                        />
                    </Field>
                    <Field label="Country" required error={errors.country_id}>
                        <Select
                            value={data.country_id || ""}
                            onChange={e => onChange({ ...data, country_id: e.target.value, city_id: "" })}
                            placeholder={data.continent_id ? "— Select —" : "Select Continent First"}
                            options={countries.map(c => ({ value: c.id, label: c.name }))}
                            disabled={!data.continent_id}
                        />
                    </Field>
                    <Field label="City" required error={errors.city_id}>
                        <Select
                            value={data.city_id || ""}
                            onChange={e => set("city_id", e.target.value)}
                            placeholder={data.country_id ? "— Select —" : "Select Country First"}
                            options={cities.map(c => ({ value: c.id, label: c.name }))}
                            disabled={!data.country_id}
                        />
                    </Field>
                </div>
            </div>
        </div>
    );
};

// ─── Step 2: Job & Contract ───────────────────────────────────────────────────

const Step2: React.FC<{
    data: ReturnType<typeof blankHistorial>;
    onChange: (d: ReturnType<typeof blankHistorial>) => void;
    errors: Errors;
}> = ({ data, onChange, errors }) => {
    const set = (k: keyof typeof data, v: string | number) => onChange({ ...data, [k]: v });
    const subAreas = data.area ? (SUB_AREAS[data.area] || []) : [];

    // ── Load Local Legal Entities from DB ──
    const [localEntities, setLocalEntities] = useState<LocalLegalEntity[]>([]);
    const [entitiesLoading, setEntitiesLoading] = useState(true);
    // ── Load Active Branches from DB ──
    const [activeBranches, setActiveBranches] = useState<Branch[]>([]);
    // ── Load Active Job Titles (with Role Titles) from DB ──
    const [jobTitleOptions, setJobTitleOptions] = useState<JobTitleRef[]>([]);
    const tenantCtx = useTenant();

    useEffect(() => {
        getLocalLegalEntitiesAction().then(entities => {
            setLocalEntities(entities);
            setEntitiesLoading(false);
        }).catch(() => setEntitiesLoading(false));
        if (tenantCtx.currentTenant?.tenant_id) {
            getActiveBranchesAction(tenantCtx.currentTenant.tenant_id).then(setActiveBranches).catch(() => { });
            getActiveJobTitlesAction(tenantCtx.currentTenant.tenant_id).then(setJobTitleOptions).catch(() => { });
        }
    }, [tenantCtx.currentTenant?.tenant_id]);

    // Derive role titles for the currently selected Job Title
    const selectedJobTitleObj = jobTitleOptions.find(jt => jt.title === data.job_title);
    const roleTitleOptions: RoleTitleRef[] = (selectedJobTitleObj?.role_titles ?? []);

    // Fallback to hard-coded list if DB returns nothing (e.g. table not yet created)
    const entityOptions = localEntities.length > 0
        ? localEntities.map(e => ({ value: e.entity_name, label: e.entity_name }))
        : ENTIDADES_LEGALES.map(e => ({ value: e, label: e }));

    return (
        <div className="space-y-6">
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                <p className="text-xs text-violet-700">
                    <strong>Tables M2 + M4 – historial_laboral.</strong> Every future change to salary, area, or contract creates a new row — preserving full history. This is the initial entry.
                </p>
            </div>

            {/* Contract */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contract Details</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Hire Date" required error={errors.fecha_inicio}>
                        <input type="date" value={data.fecha_inicio}
                            onChange={e => set("fecha_inicio", e.target.value)}
                            className={inputCls(errors.fecha_inicio)} />
                    </Field>
                    <Field label="Contract Type" required error={errors.tipo_contrato}>
                        <Select value={data.tipo_contrato}
                            onChange={e => set("tipo_contrato", e.target.value)}
                            error={errors.tipo_contrato}
                            placeholder="— Select —"
                            options={TIPOS_CONTRATO.map(t => ({ value: t.value, label: t.label }))} />
                    </Field>
                    <Field label="Salary Type" required error={errors.tipo_salario}>
                        <Select value={data.tipo_salario}
                            onChange={e => set("tipo_salario", e.target.value)}
                            error={errors.tipo_salario}
                            placeholder="— Select —"
                            options={TIPOS_SALARIO.map(t => ({ value: t.value, label: t.label }))} />
                    </Field>
                    <Field label="Local Entity" required error={errors.entidad_legal}
                        hint="Legal entity holding the contract in Colombia">
                        <Select value={data.entidad_legal}
                            onChange={e => set("entidad_legal", e.target.value)}
                            error={errors.entidad_legal}
                            placeholder={entitiesLoading ? "Loading entities..." : "— Select Entity —"}
                            options={entityOptions}
                            disabled={entitiesLoading} />
                    </Field>
                    <Field label="Base Salary [Local Currency]" required error={errors.salario_base}
                        hint="Monthly gross salary in the employee's local currency">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">{data.salary_currency || "$"}</span>
                            <input type="number" value={data.salario_base || ""}
                                onChange={e => set("salario_base", parseFloat(e.target.value) || 0)}
                                className={cn(inputCls(errors.salario_base), "pl-9")}
                                placeholder="5000" min={0} />
                        </div>
                    </Field>
                    <Field label="Currency" required error={errors.salary_currency}>
                        <Select value={data.salary_currency || ""}
                            onChange={e => set("salary_currency", e.target.value)}
                            placeholder="— Select —"
                            options={[
                                { value: "USD", label: "USD" },
                                { value: "COP", label: "COP" },
                                { value: "EUR", label: "EUR" },
                                { value: "PEN", label: "PEN" },
                            ]} />
                    </Field>
                    <Field label="Income Tax Procedure" error={errors.procedimiento_renta}
                        hint="Procedure 1 or 2 for withholding tax (retención en la fuente)">
                        <Select value={data.procedimiento_renta}
                            onChange={e => set("procedimiento_renta", parseInt(e.target.value))}
                            placeholder="— Select —"
                            options={[
                                { value: 1, label: "Procedure 1" },
                                { value: 2, label: "Procedure 2" },
                            ]} />
                    </Field>
                    <Field label="Dedication %" required error={errors.digito_dedicacion}
                        hint="Percentage of time dedicated to this position (1–100)">
                        <div className="relative">
                            <input type="number" value={data.digito_dedicacion}
                                onChange={e => set("digito_dedicacion", parseInt(e.target.value) || 0)}
                                className={cn(inputCls(errors.digito_dedicacion), "pr-8")}
                                min={1} max={100} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                        </div>
                    </Field>
                </div>
            </div>

            {/* Org Structure */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Organizational Structure</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Area" required error={errors.area}>
                        <Select value={data.area}
                            onChange={e => { set("area", e.target.value); onChange({ ...data, area: e.target.value, sub_area: "", job_title: "", role_title: "" } as any); }}
                            error={errors.area}
                            placeholder="— Select area —"
                            options={AREAS_EMPRESA.map(a => ({ value: a, label: a }))} />
                    </Field>
                    <Field label="Sub-Area" required error={errors.sub_area}>
                        <Select value={data.sub_area}
                            onChange={e => set("sub_area", e.target.value)}
                            error={errors.sub_area}
                            placeholder={data.area ? "— Select sub-area —" : "— Select area first —"}
                            options={subAreas.map(s => ({ value: s, label: s }))}
                            disabled={!data.area} />
                    </Field>
                    {/* Job Title + Role Title — side by side */}
                    <Field label="Job Title" error={errors.job_title}
                        hint="Official role from Job Title Library">
                        <Select value={data.job_title}
                            onChange={e => {
                                // Reset role_title when job title changes
                                onChange({ ...data, job_title: e.target.value, role_title: "" } as any);
                            }}
                            placeholder="— Select Job Title —"
                            options={jobTitleOptions
                                .filter(jt => !data.area || !jt.area || jt.area === data.area)
                                .map(jt => ({ value: jt.title, label: jt.title }))} />
                    </Field>
                    <Field label="Role Title" error={(errors as any).role_title}
                        hint={data.job_title ? "Select an operational role assigned to this employee" : "Select a Job Title first"}>
                        <Select
                            value={(data as any).role_title || ""}
                            onChange={e => set("role_title" as any, e.target.value)}
                            placeholder={data.job_title ? (roleTitleOptions.length > 0 ? "— Select Role Title —" : "No role titles defined") : "— Select Job Title first —"}
                            options={roleTitleOptions.map(rt => ({ value: rt.role_title, label: rt.role_title }))}
                            disabled={!data.job_title || roleTitleOptions.length === 0} />
                        {(data as any).role_title && (() => {
                            const found = roleTitleOptions.find(rt => rt.role_title === (data as any).role_title);
                            return found?.describe_role ? (
                                <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">{found.describe_role}</p>
                            ) : null;
                        })()}
                    </Field>
                    <Field label="Cost Center" required error={errors.centro_costo}
                        hint="Alphanumeric, max 10 characters">
                        <input type="text" value={data.centro_costo}
                            onChange={e => set("centro_costo", e.target.value.toUpperCase())}
                            className={inputCls(errors.centro_costo)}
                            placeholder="CC-OPS-01" maxLength={10} />
                    </Field>
                    <Field label="Cost Center Name" error={errors.nombre_centro_costo}>
                        <input type="text" value={data.nombre_centro_costo}
                            onChange={e => set("nombre_centro_costo", e.target.value)}
                            className={inputCls()} placeholder="Operations – BPO Delivery" />
                    </Field>
                    <Field label="Sub Cost Center" error={errors.sub_centro_costo}>
                        <input type="text" value={data.sub_centro_costo}
                            onChange={e => set("sub_centro_costo", e.target.value.toUpperCase())}
                            className={inputCls()} placeholder="SCC-01" maxLength={10} />
                    </Field>
                    <Field label="Branch / Sede" error={errors.branch}
                        hint="Active branch from Branch Master">
                        <Select value={data.branch}
                            onChange={e => set("branch", e.target.value)}
                            error={errors.branch}
                            placeholder="— Select Branch —"
                            options={activeBranches.map(b => ({
                                value: b.branch_code,
                                label: b.branch_code + (b.branch_name ? ` — ${b.branch_name}` : "")
                            }))} />
                    </Field>
                    <Field label="Client" error={errors.cliente}
                        hint="Client code (max 15 chars)">
                        <input type="text" value={data.cliente}
                            onChange={e => set("cliente", e.target.value)}
                            className={inputCls()} placeholder="CLIENT-001" maxLength={15} />
                    </Field>
                    <Field label="Project" error={errors.project}>
                        <input type="text" value={data.project}
                            onChange={e => set("project", e.target.value)}
                            className={inputCls()} placeholder="US Mortgage BPO 2025" maxLength={100} />
                    </Field>
                    <Field label="Direct Leader ID" error={errors.direct_leader_id}
                        hint="EID of direct manager (e.g. EID-1234)">
                        <input type="text" value={data.direct_leader_id || ""}
                            onChange={e => set("direct_leader_id", e.target.value)}
                            className={inputCls(errors.direct_leader_id)}
                            placeholder="EID-0001" maxLength={20} />
                    </Field>
                </div>
            </div>
        </div>
    );
};


// ─── Step 3: Social Security ──────────────────────────────────────────────────

const Step3: React.FC<{
    data: EmpleadoAfiliaciones;
    onChange: (d: EmpleadoAfiliaciones) => void;
    errors: Errors;
}> = ({ data, onChange, errors }) => {
    const setEntity = (
        idKey: keyof EmpleadoAfiliaciones,
        nameKey: keyof EmpleadoAfiliaciones,
        id: string,
        options: { id: string; nombre: string }[]
    ) => {
        const found = options.find(o => o.id === id);
        onChange({ ...data, [idKey]: id, [nameKey]: found?.nombre || "" });
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                    <strong>Table M3 – empleados_afiliaciones.</strong> All fields are mandatory for PILA reporting and legal compliance in Colombia.
                </p>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Health & Pension</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="EPS (Health Entity)" required error={errors.eps_id}>
                        <Select value={data.eps_id}
                            onChange={e => setEntity("eps_id", "eps_nombre", e.target.value, EPS_OPTIONS)}
                            error={errors.eps_id}
                            placeholder="— Select EPS —"
                            options={EPS_OPTIONS.map(o => ({ value: o.id, label: o.nombre }))} />
                    </Field>
                    <Field label="AFP (Pension Fund)" required error={errors.afp_id}>
                        <Select value={data.afp_id}
                            onChange={e => setEntity("afp_id", "afp_nombre", e.target.value, AFP_OPTIONS)}
                            error={errors.afp_id}
                            placeholder="— Select AFP —"
                            options={AFP_OPTIONS.map(o => ({ value: o.id, label: o.nombre }))} />
                    </Field>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ARL & Compensation Fund</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="ARL (Work Risk Admin.)" required error={errors.arl_id}>
                        <Select value={data.arl_id}
                            onChange={e => setEntity("arl_id", "arl_nombre", e.target.value, ARL_OPTIONS)}
                            error={errors.arl_id}
                            placeholder="— Select ARL —"
                            options={ARL_OPTIONS.map(o => ({ value: o.id, label: o.nombre }))} />
                    </Field>
                    <Field label="ARL Risk Level" required error={errors.nivel_riesgo_arl}
                        hint="Class I (office) to V (high risk)">
                        <Select value={data.nivel_riesgo_arl}
                            onChange={e => onChange({ ...data, nivel_riesgo_arl: parseInt(e.target.value) as any })}
                            error={errors.nivel_riesgo_arl}
                            placeholder="— Select class —"
                            options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `Class ${n}` }))} />
                    </Field>
                    <Field label="CCF (Compensation Fund)" required error={errors.ccf_id}>
                        <Select value={data.ccf_id}
                            onChange={e => setEntity("ccf_id", "ccf_nombre", e.target.value, CCF_OPTIONS)}
                            error={errors.ccf_id}
                            placeholder="— Select CCF —"
                            options={CCF_OPTIONS.map(o => ({ value: o.id, label: o.nombre }))} />
                    </Field>
                    <Field label="PILA Contributor Subtype" required error={errors.subtipo_cotizante}
                        hint="Código PILA – defines contribution rules">
                        <Select value={data.subtipo_cotizante}
                            onChange={e => onChange({ ...data, subtipo_cotizante: e.target.value })}
                            error={errors.subtipo_cotizante}
                            placeholder="— Select subtype —"
                            options={SUBTIPO_COTIZANTE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
                    </Field>
                </div>
            </div>
        </div>
    );
};

// ─── Step 4: SST & Emergency ──────────────────────────────────────────────────

const Step4: React.FC<{
    data: EmpleadoSST;
    onChange: (d: EmpleadoSST) => void;
    errors: Errors;
}> = ({ data, onChange, errors }) => {
    const set = (k: keyof EmpleadoSST, v: string | number) => onChange({ ...data, [k]: v });

    return (
        <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700">
                    <strong>Table M5 – empleados_sst.</strong> Clothing sizes are legally required for <em>dotación</em> (work uniform provision). Blood type and emergency contact are critical for workplace safety.
                </p>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dotación (Work Uniform Sizes)</h4>
                <div className="grid grid-cols-3 gap-4">
                    <Field label="Shirt Size" required error={errors.talla_camisa}>
                        <Select value={data.talla_camisa}
                            onChange={e => set("talla_camisa", e.target.value)}
                            error={errors.talla_camisa}
                            placeholder="— Size —"
                            options={["XS", "S", "M", "L", "XL", "XXL"].map(s => ({ value: s, label: s }))} />
                    </Field>
                    <Field label="Pants Size" required error={errors.talla_pantalon}>
                        <Select value={data.talla_pantalon}
                            onChange={e => set("talla_pantalon", e.target.value)}
                            error={errors.talla_pantalon}
                            placeholder="— Size —"
                            options={["28", "30", "32", "34", "36", "38", "40", "42"].map(s => ({ value: s, label: s }))} />
                    </Field>
                    <Field label="Shoe Size" required error={errors.talla_calzado}
                        hint="Colombian shoe size (e.g. 38)">
                        <input type="number" value={data.talla_calzado || ""}
                            onChange={e => set("talla_calzado", parseInt(e.target.value) || 0)}
                            className={inputCls(errors.talla_calzado)}
                            placeholder="38" min={30} max={50} />
                    </Field>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Medical Information</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Blood Type" required error={errors.tipo_sangre}
                        hint="Critical for emergencies and SST protocols">
                        <Select value={data.tipo_sangre}
                            onChange={e => set("tipo_sangre", e.target.value)}
                            error={errors.tipo_sangre}
                            placeholder="— Blood type —"
                            options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(s => ({ value: s, label: s }))} />
                    </Field>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Contact Full Name" required error={errors.contacto_emergencia}>
                        <input type="text" value={data.contacto_emergencia}
                            onChange={e => set("contacto_emergencia", e.target.value)}
                            className={inputCls(errors.contacto_emergencia)}
                            placeholder="María García (Mother)" maxLength={100} />
                    </Field>
                    <Field label="Contact Phone" required error={errors.telefono_emergencia}>
                        <input type="tel" value={data.telefono_emergencia}
                            onChange={e => set("telefono_emergencia", e.target.value)}
                            className={inputCls(errors.telefono_emergencia)}
                            placeholder="+57 300 123 4567" maxLength={20} />
                    </Field>
                </div>
            </div>
        </div>
    );
};

// ─── Step 5: Review & Save ────────────────────────────────────────────────────

const ReviewRow: React.FC<{ label: string; value: string | number; mono?: boolean }> = ({ label, value, mono }) => (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-400 shrink-0 w-44">{label}</span>
        <span className={cn("text-xs font-medium text-slate-700 text-right", mono && "font-mono")}>{String(value) || "—"}</span>
    </div>
);

const ReviewSection: React.FC<{ title: string; color: string; children: React.ReactNode; onEdit?: () => void }> = ({ title, color, children, onEdit }) => (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className={cn("px-4 py-2.5 border-b border-slate-100 flex items-center justify-between", color)}>
            <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
            {onEdit && (
                <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/60 hover:bg-white rounded border border-current/20 text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                    Edit Form
                </button>
            )}
        </div>
        <div className="px-4 py-1">{children}</div>
    </div>
);

const Step5: React.FC<{
    maestro: ReturnType<typeof blankMaestro>;
    historial: ReturnType<typeof blankHistorial>;
    afiliaciones: EmpleadoAfiliaciones;
    sst: EmpleadoSST;
    eid: string;
    currentTenantId: string;
    onEditStep: (stepId: number) => void;
}> = ({ maestro, historial, afiliaciones, sst, eid, currentTenantId, onEditStep }) => {
    const municipio = MUNICIPIOS_DANE.find(m => m.code === maestro.municipio_dane);
    const eps = EPS_OPTIONS.find(e => e.id === afiliaciones.eps_id);
    const afp = AFP_OPTIONS.find(a => a.id === afiliaciones.afp_id);
    const arl = ARL_OPTIONS.find(a => a.id === afiliaciones.arl_id);
    const ccf = CCF_OPTIONS.find(c => c.id === afiliaciones.ccf_id);

    return (
        <div className="space-y-4">
            <div className="bg-navy-blue/5 border border-navy-blue/15 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-navy-blue mt-0.5 shrink-0" />
                <p className="text-xs text-navy-blue/80">
                    Review all data carefully. Clicking <strong>Save Employee</strong> will create a new record in the <strong>HC Master</strong> and initialize all 5 database tables. This action cannot be undone without a formal amendment.
                </p>
            </div>

            {/* EID Badge */}
            <div className="flex items-center gap-3 bg-cobalt-blue rounded-xl px-5 py-3">
                <div>
                    <p className="text-xs text-white/60 font-medium">Assigned Tenant & ID</p>
                    <p className="text-xl font-bold text-white font-mono tracking-wider">
                        {currentTenantId || "—"}-{eid}
                    </p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-xs text-white/60">Status</p>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                </div>
            </div>

            <ReviewSection title="M1 – Personal Identity" color="bg-cobalt-blue/5 text-cobalt-blue" onEdit={() => onEditStep(1)}>
                <ReviewRow label="Document" value={`${maestro.tipo_documento_id} ${maestro.numero_identificacion}`} mono />
                <ReviewRow label="Full Name" value={[maestro.primer_nombre, maestro.otros_nombres, maestro.primer_apellido, maestro.segundo_apellido].filter(Boolean).join(" ")} />
                <ReviewRow label="Date of Birth" value={maestro.fecha_nacimiento} />
                <ReviewRow label="Gender" value={maestro.genero === "M" ? "Male" : maestro.genero === "F" ? "Female" : "Non-binary"} />
                <ReviewRow label="Personal Email" value={maestro.email_personal} />
                <ReviewRow label="Municipality" value={municipio ? `${municipio.code} – ${municipio.name}` : maestro.municipio_dane} />
                <ReviewRow label="Address" value={maestro.direccion_residencia} />
            </ReviewSection>

            <ReviewSection title="M2/M4 – Job & Contract" color="bg-violet-50 text-violet-700" onEdit={() => onEditStep(2)}>
                <ReviewRow label="Hire Date" value={historial.fecha_inicio} />
                <ReviewRow label="Contract Type" value={historial.tipo_contrato} />
                <ReviewRow label="Salary Type" value={historial.tipo_salario} />
                <ReviewRow label="Base Salary" value={`COP ${historial.salario_base.toLocaleString("es-CO")}`} />
                <ReviewRow label="Tax Procedure" value={historial.procedimiento_renta ? `Procedure ${historial.procedimiento_renta}` : "—"} />
                <ReviewRow label="Area / Sub-Area" value={`${historial.area} / ${historial.sub_area}`} />
                <ReviewRow label="Cost Center" value={`${historial.centro_costo} – ${historial.nombre_centro_costo}`} mono />
                <ReviewRow label="Branch" value={historial.branch || "—"} />
                <ReviewRow label="Client / Project" value={`${historial.cliente || "—"} / ${historial.project || "—"}`} />
                <ReviewRow label="Dedication" value={`${historial.digito_dedicacion}%`} />
                <ReviewRow label="Direct Leader" value={historial.direct_leader} />
            </ReviewSection>

            <ReviewSection title="M3 – Social Security" color="bg-amber-50 text-amber-700" onEdit={() => onEditStep(3)}>
                <ReviewRow label="EPS" value={eps?.nombre || afiliaciones.eps_id} />
                <ReviewRow label="AFP" value={afp?.nombre || afiliaciones.afp_id} />
                <ReviewRow label="ARL" value={`${arl?.nombre || afiliaciones.arl_id} – Class ${afiliaciones.nivel_riesgo_arl}`} />
                <ReviewRow label="CCF" value={ccf?.nombre || afiliaciones.ccf_id} />
                <ReviewRow label="PILA Subtype" value={afiliaciones.subtipo_cotizante} mono />
            </ReviewSection>

            <ReviewSection title="M5 – SST & Emergency" color="bg-emerald-50 text-emerald-700" onEdit={() => onEditStep(4)}>
                <ReviewRow label="Shirt / Pants / Shoe" value={`${sst.talla_camisa} / ${sst.talla_pantalon} / ${sst.talla_calzado}`} />
                <ReviewRow label="Blood Type" value={sst.tipo_sangre} />
                <ReviewRow label="Emergency Contact" value={`${sst.contacto_emergencia} – ${sst.telefono_emergencia}`} />
            </ReviewSection>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface EmployeeIntakeProps {
    onClose: () => void;
    onSave: (record: FullEmployeeRecord) => void;
}

export const EmployeeIntakeApp: React.FC<EmployeeIntakeProps> = ({ onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [eid] = useState(genEID);
    const [saved, setSaved] = useState(false);
    const [anyTenantExists, setAnyTenantExists] = useState(false);

    React.useEffect(() => {
        const checkTenants = async () => {
            const active = await getActiveTenants();
            setAnyTenantExists(active.length > 0);
        };
        checkTenants();
    }, []);

    const [maestro, setMaestro] = useState(blankMaestro());
    const [historial, setHistorial] = useState(blankHistorial());
    const [afiliaciones, setAfiliaciones] = useState(blankAfiliaciones());
    const [sst, setSST] = useState(blankSST());
    const [fotoUrl, setFotoUrl] = useState<string>("");

    const [errors, setErrors] = useState<Errors>({});

    const validate = useCallback((s: number): Errors => {
        if (s === 1) return validateStep1(maestro);
        if (s === 2) return validateStep2(historial);
        if (s === 3) return validateStep3(afiliaciones);
        if (s === 4) return validateStep4(sst);
        return {};
    }, [maestro, historial, afiliaciones, sst]);

    // Free navigation — no sequential enforcement for steps 1-4
    const goToStep = (target: number) => {
        setErrors({});
        setStep(target);
    };

    const goNext = () => goToStep(Math.min(step + 1, 5));
    const goPrev = () => goToStep(Math.max(step - 1, 1));

    // Per-segment "Save Progress" — validates only the current step
    const [stepSaved, setStepSaved] = useState<number | null>(null);
    const handleSaveProgress = () => {
        const errs = validate(step);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setStepSaved(step);
        setTimeout(() => setStepSaved(null), 2500);
    };

    const [dbError, setDbError] = useState<string | null>(null);

    const handleSave = async () => {
        setDbError(null);
        const now = new Date().toISOString();

        // Extract extra keys that were temporarily stored in the step states
        const { continent_id, country_id, city_id, ...cleanMaestro } = maestro as any;
        const { salary_currency, direct_leader_id, ...cleanHistorial } = historial as any;

        const record: FullEmployeeRecord = {
            eid,
            status: "Active",
            tenant_id: currentTenant?.tenant_id,
            continent_id: continent_id || null,
            country_id: country_id || null,
            city_id: city_id || null,
            salary_currency: salary_currency || null,
            direct_leader_id: direct_leader_id || null,
            maestro: { ...cleanMaestro, created_at: now, updated_at: now },
            historialLaboral: { ...cleanHistorial, empleado_id: cleanMaestro.numero_identificacion, id_historial: 1, created_at: now },
            afiliaciones: { ...afiliaciones, empleado_id: cleanMaestro.numero_identificacion, updated_at: now },
            sst: { ...sst, empleado_id: cleanMaestro.numero_identificacion },
            email_corporativo: `${cleanMaestro.primer_nombre.toLowerCase()}.${cleanMaestro.primer_apellido.toLowerCase()}@homesi.co`,
            foto_url: fotoUrl || undefined,
        };

        try {
            await onSave(record);
            setSaved(true);
            setTimeout(() => onClose(), 1800);
        } catch (err: any) {
            console.error("Failed to save employee to DB:", err);
            setDbError(err.message || "Error Desconocido de Conexión a Base de Datos");
        }
    };

    const currentStep = STEPS[step - 1];
    const errorCount = Object.keys(errors).length;
    const { currentTenant } = useTenant();
    const hasActiveTenant = !!currentTenant;

    // ── Tenant Blocker ──────────────────────────────────────────────────────
    if (!hasActiveTenant) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
                    <div className="px-6 py-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-7 h-7 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-navy-blue mb-2">No Active Tenant</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {anyTenantExists
                                ? "Please select an active tenant from the header before adding employees."
                                : "You must create and select a Tenant before adding employees. Go to Administrator → Multi-Tenant Set Up."}
                        </p>
                    </div>
                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cobalt-blue/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-cobalt-blue" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-navy-blue leading-tight">Employee Intake</h2>
                            <p className="text-xs text-slate-400">New employee registration — {currentStep.table}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saved && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to HC Master
                            </span>
                        )}
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Stepper (clickable steps for free navigation) ── */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-0">
                        {STEPS.map((s, i) => {
                            const isActive = step === s.id;
                            const isDone = step > s.id;
                            const Icon = s.icon;
                            return (
                                <React.Fragment key={s.id}>
                                    <button
                                        onClick={() => goToStep(s.id)}
                                        className="flex flex-col items-center gap-1.5 min-w-[80px] group"
                                        title={`Go to ${s.label}`}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                                            isDone ? "bg-emerald-500 border-emerald-500" :
                                                isActive ? `${s.bg} border-transparent` :
                                                    "bg-white border-slate-200 group-hover:border-cobalt-blue/40"
                                        )}>
                                            {isDone ? (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            ) : (
                                                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400 group-hover:text-cobalt-blue")} />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-semibold text-center leading-tight",
                                            isActive ? "text-navy-blue" : isDone ? "text-emerald-600" : "text-slate-400 group-hover:text-cobalt-blue"
                                        )}>
                                            {s.label}
                                        </span>
                                    </button>
                                    {i < STEPS.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-0.5 mb-5 transition-colors",
                                            step > s.id ? "bg-emerald-400" : "bg-slate-200"
                                        )} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* ── Form Body ── */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {dbError && (
                        <div className="mb-4 flex items-center gap-3 bg-action-red/10 border border-action-red/20 rounded-xl px-4 py-3 animate-in shake duration-300">
                            <ShieldAlert className="w-5 h-5 text-action-red shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-action-red font-bold uppercase tracking-wider">Error de Conexión a Base de Datos</p>
                                <p className="text-[11px] text-action-red/80 leading-relaxed font-medium">{dbError}</p>
                            </div>
                        </div>
                    )}

                    {errorCount > 0 && (
                        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-action-red shrink-0" />
                            <p className="text-xs text-action-red font-medium">
                                {errorCount} required field{errorCount > 1 ? "s" : ""} need{errorCount === 1 ? "s" : ""} attention before you can continue.
                            </p>
                        </div>
                    )}

                    {step === 1 && <Step1 data={maestro} onChange={setMaestro} errors={errors} fotoUrl={fotoUrl} onFotoChange={setFotoUrl} />}
                    {step === 2 && <Step2 data={historial} onChange={setHistorial} errors={errors} />}
                    {step === 3 && <Step3 data={afiliaciones} onChange={setAfiliaciones} errors={errors} />}
                    {step === 4 && <Step4 data={sst} onChange={setSST} errors={errors} />}
                    {step === 5 && (
                        <Step5 maestro={maestro} historial={historial}
                            afiliaciones={afiliaciones} sst={sst} eid={eid} currentTenantId={currentTenant?.tenant_id || ""}
                            onEditStep={setStep} />
                    )}
                </div>

                {/* ── Footer Navigation ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Step {step} of {STEPS.length}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400 font-mono">{currentStep.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {step > 1 && step < 5 && (
                            <button onClick={goPrev}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        {step < 5 && (
                            <>
                                <button
                                    onClick={handleSaveProgress}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border rounded-lg transition-colors",
                                        stepSaved === step
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    {stepSaved === step ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
                                    ) : (
                                        <><Save className="w-3.5 h-3.5" /> Save Progress</>
                                    )}
                                </button>
                                <button onClick={goNext}
                                    className="flex items-center gap-2 px-5 py-2 bg-cobalt-blue text-white text-sm font-semibold rounded-lg hover:bg-cobalt-blue/90 transition-colors shadow-sm">
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        {step === 5 && (
                            <>
                                <button onClick={goPrev}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <button onClick={handleSave} disabled={saved}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60">
                                    <Save className="w-4 h-4" />
                                    Save Employee to HC Maestro
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
