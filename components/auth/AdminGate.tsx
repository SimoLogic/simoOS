"use client";

import React, { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/auth/supabase-browser-client";

interface AdminGateProps {
    children: React.ReactNode;
    /** Título mostrado en la pantalla de login (contexto de qué se está protegiendo). */
    title?: string;
    /** Roles permitidos (OR) -- por defecto solo 'admin', mantiene el comportamiento
     * original de este componente para el gate de HC Master ya en producción. */
    requiredRoles?: string[];
}

type GateStatus = "checking" | "signed-out" | "not-admin" | "admin";

/**
 * Protege contenido sensible (hoy: datos de empleados en RRHH) detrás de
 * login + rol "admin" (public.user_roles), sin exigir login para el resto
 * de la app -- decisión 2026-07-31, ver docs/AGENT_CONTEXT_ANTIGRAVITY.md.
 *
 * No usa el cliente de lib/database.ts (ese prioriza service role key,
 * inapropiado para el navegador) -- ver lib/auth/supabase-browser-client.ts.
 */
export const AdminGate: React.FC<AdminGateProps> = ({
    children,
    title = "Acceso restringido",
    requiredRoles = ["admin"],
}) => {
    const [status, setStatus] = useState<GateStatus>("checking");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function checkAdmin(session: Session | null) {
        if (!session) {
            setStatus("signed-out");
            return;
        }
        const { data, error } = await supabaseBrowser.rpc("current_user_has_any_role", {
            required_roles: requiredRoles,
        });
        if (error) {
            console.error("current_user_has_any_role RPC failed", error);
            setStatus("not-admin");
            return;
        }
        setStatus(data ? "admin" : "not-admin");
    }

    useEffect(() => {
        supabaseBrowser.auth.getSession().then(({ data }) => checkAdmin(data.session));

        const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
            checkAdmin(session);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setLoginError(null);
        const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
        if (error) {
            setLoginError(
                error.message === "Invalid login credentials"
                    ? "Correo o contraseña incorrectos."
                    : error.message
            );
        }
        setIsSubmitting(false);
    }

    async function handleLogout() {
        await supabaseBrowser.auth.signOut();
        setEmail("");
        setPassword("");
    }

    if (status === "checking") {
        return (
            <div className="flex-1 h-full flex items-center justify-center text-slate-400 text-sm">
                Verificando acceso…
            </div>
        );
    }

    if (status === "admin") {
        return <>{children}</>;
    }

    if (status === "not-admin") {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="text-lg font-semibold text-slate-700">Acceso restringido</div>
                <p className="text-sm text-slate-500 max-w-md">
                    Tu cuenta no tiene permiso de administrador para ver esta información. Si crees que
                    esto es un error, contacta a tu administrador de simoOS.
                </p>
                <button
                    onClick={handleLogout}
                    className="mt-2 text-sm text-[#0047AB] hover:underline"
                >
                    Cerrar sesión
                </button>
            </div>
        );
    }

    // status === 'signed-out'
    return (
        <div className="flex-1 h-full flex items-center justify-center px-6">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4"
            >
                <div>
                    <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Esta sección requiere iniciar sesión con una cuenta de administrador.
                    </p>
                </div>

                <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Correo
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]"
                        autoComplete="username"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Contraseña
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047AB]"
                        autoComplete="current-password"
                    />
                </label>

                {loginError && <div className="text-sm text-red-600">{loginError}</div>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#0047AB] text-white text-sm font-medium rounded-md py-2 disabled:opacity-50"
                >
                    {isSubmitting ? "Entrando…" : "Iniciar sesión"}
                </button>
            </form>
        </div>
    );
};
