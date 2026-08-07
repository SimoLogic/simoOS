"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/auth/supabase-browser-client";
import { useTenant } from "@/lib/tenant-context";

interface AdminGateProps {
    children: React.ReactNode;
    /** Title shown on the login screen (context of what is being protected). */
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
    title = "Restricted access",
    requiredRoles = ["admin"],
}) => {
    const [status, setStatus] = useState<GateStatus>("checking");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { currentTenant, setCurrentTenantById } = useTenant();

    /** Último user.id ya verificado -- evita re-chequear en cada evento de auth. */
    const verifiedUserIdRef = useRef<string | null>(null);
    /** currentTenant en un ref: la suscripción de abajo se monta una sola vez y
     *  si leyera la variable de render se quedaría con el valor del primer
     *  render (null) para siempre. */
    const currentTenantIdRef = useRef<string | null>(null);
    currentTenantIdRef.current = currentTenant?.tenant_id ?? null;

    /** setStatus idempotente: si el valor no cambió, no se toca el estado.
     *  Crítico -- cualquier cambio de `status` desmonta y vuelve a montar
     *  `children`, y con eso se pierde su estado interno (ver checkAdmin). */
    function setStatusIfChanged(next: GateStatus) {
        setStatus((prev) => (prev === next ? prev : next));
    }

    async function checkAdmin(session: Session | null) {
        if (!session) {
            verifiedUserIdRef.current = null;
            setStatusIfChanged("signed-out");
            return;
        }
        const { data, error } = await supabaseBrowser.rpc("current_user_has_any_role", {
            required_roles: requiredRoles,
        });
        if (error) {
            console.error("current_user_has_any_role RPC failed", error);
            verifiedUserIdRef.current = null;
            setStatusIfChanged("not-admin");
            return;
        }
        if (data) {
            // Auto-selecciona el tenant del usuario -- hoy cada usuario
            // pertenece a un solo tenant (public.users.tenant_id), así que no
            // hace falta pedirle que elija manualmente en el dropdown "Select
            // Tenant" del TopBar (ese selector sigue existiendo para el resto
            // de la app, que no requiere login).
            const { data: userRow, error: userError } = await supabaseBrowser
                .from("users")
                .select("tenant_id")
                .eq("id", session.user.id)
                .single();

            if (!userError && userRow?.tenant_id && userRow.tenant_id !== currentTenantIdRef.current) {
                await setCurrentTenantById(userRow.tenant_id);
            }
        }
        verifiedUserIdRef.current = data ? session.user.id : null;
        setStatusIfChanged(data ? "admin" : "not-admin");
    }

    useEffect(() => {
        supabaseBrowser.auth.getSession().then(({ data }) => checkAdmin(data.session));

        // onAuthStateChange NO es solo login/logout: auth-js emite SIGNED_IN
        // cada vez que la pestaña vuelve a estar visible (_onVisibilityChanged
        // -> _recoverAndRefresh) y TOKEN_REFRESHED cada vez que el ticker
        // renueva el token. Si en cada uno de esos eventos se volviera a
        // consultar el rol y a llamar setStatus, un solo fallo transitorio de
        // la RPC (p. ej. la petición sale con el token viejo justo durante el
        // refresh) manda `status` a "not-admin", desmonta `children` y borra su
        // estado; al siguiente evento vuelve a "admin" y `children` se remonta
        // en blanco. Eso es lo que hacía que la Carga Centralizada volviera
        // sola a la pantalla de "seleccionar archivo" después de subir.
        //
        // Por eso: si el usuario de la sesión es el mismo que ya verificamos,
        // el evento se ignora por completo (ni RPC ni setState).
        const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
            const userId = session?.user?.id ?? null;
            if (userId && userId === verifiedUserIdRef.current) return;
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
                    ? "Incorrect email or password."
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
                Checking access…
            </div>
        );
    }

    if (status === "admin") {
        return <>{children}</>;
    }

    if (status === "not-admin") {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="text-lg font-semibold text-slate-700">Restricted access</div>
                <p className="text-sm text-slate-500 max-w-md">
                    Your account does not have administrator permission to view this information. If you
                    think this is a mistake, contact your simoOS administrator.
                </p>
                <button
                    onClick={handleLogout}
                    className="mt-2 text-sm text-[#0047AB] hover:underline"
                >
                    Sign out
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
                        This section requires signing in with an administrator account.
                    </p>
                </div>

                <label className="flex flex-col gap-1 text-sm text-slate-600">
                    Email
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
                    Password
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
                    {isSubmitting ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );
};
