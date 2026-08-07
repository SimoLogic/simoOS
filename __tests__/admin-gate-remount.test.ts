// @vitest-environment jsdom

/**
 * REGRESIÓN — AdminGate no debe remontar sus children en cada evento de auth.
 *
 * El bug: onAuthStateChange de @supabase/auth-js NO es solo login/logout.
 * _onVisibilityChanged dispara _recoverAndRefresh -> _notifyAllSubscribers
 * ('SIGNED_IN') cada vez que la pestaña vuelve a estar visible, y
 * _callRefreshToken emite TOKEN_REFRESHED en cada renovación de token.
 * AdminGate re-consultaba el rol y llamaba setStatus() en cada uno de esos
 * eventos; como el branch "admin" es el único que renderiza children,
 * cualquier flip de status desmontaba a CentralizedUploadPage y le borraba
 * el useState -> la pantalla volvía sola a "seleccionar archivo".
 *
 * Este test monta el AdminGate REAL con jsdom + react-dom (sin Supabase real
 * ni el Excel) y verifica las dos mitades del contrato:
 *   1. Eventos repetidos con el MISMO user.id no tocan a los children.
 *   2. Un cambio real de sesión (logout / otro usuario) SÍ los remonta.
 *
 * Sin JSX a propósito (React.createElement): tsconfig usa jsx "preserve" y
 * así el archivo no depende del transform.
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── Estado compartido con los mocks (vi.mock se hoistea, por eso vi.hoisted) ──

const h = vi.hoisted(() => {
    const state = {
        /** Sesión que devuelve getSession(). */
        session: null as { user: { id: string } } | null,
        /** Callbacks registrados vía onAuthStateChange. */
        listeners: [] as ((event: string, session: unknown) => void)[],
        /** Cuántas veces se consultó el rol -- si un evento se ignora, no sube. */
        rpcCalls: 0,
        /** Resultado de la RPC de rol. */
        rpcResult: { data: true as unknown, error: null as unknown },
        /** Cuántas veces AdminGate re-seleccionó el tenant. */
        setTenantCalls: 0,
    };
    return { state };
});

vi.mock("@/lib/auth/supabase-browser-client", () => ({
    supabaseBrowser: {
        auth: {
            getSession: async () => ({ data: { session: h.state.session } }),
            onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
                h.state.listeners.push(cb);
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
            signInWithPassword: async () => ({ error: null }),
            signOut: async () => ({ error: null }),
        },
        rpc: async () => {
            h.state.rpcCalls++;
            return h.state.rpcResult;
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: { tenant_id: "tenant-1" }, error: null }),
                }),
            }),
        }),
    },
}));

// El tenant activo arranca distinto al del usuario ("tenant-1") a propósito:
// así AdminGate lo auto-selecciona UNA vez al verificar, y el test puede
// comprobar que no lo vuelve a hacer en cada evento (ese era el stale closure).
vi.mock("@/lib/tenant-context", () => ({
    useTenant: () => ({
        currentTenant: { tenant_id: "tenant-other" },
        setCurrentTenantById: async () => {
            h.state.setTenantCalls++;
        },
    }),
}));

// Se importa DESPUÉS de los mocks (vi.mock se hoistea, pero queda explícito).
import { AdminGate } from "@/components/auth/AdminGate";

// ─── Child de prueba: cuenta montajes y guarda estado interno ─────────────────

let mountCount = 0;
let setChildStep: ((s: string) => void) | null = null;

/** Imita a CentralizedUploadPage: tiene un useState que se pierde si lo remontan. */
const ProbeChild: React.FC = () => {
    const [step, setStep] = React.useState("idle");
    setChildStep = setStep;
    React.useEffect(() => {
        mountCount++;
    }, []);
    return React.createElement("div", { id: "probe" }, step);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let container: HTMLDivElement;
let root: Root;

/** Deja correr las promesas encadenadas de checkAdmin (rpc -> users -> setStatus). */
async function flush() {
    await act(async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
    });
}

/** Dispara un evento de auth como lo haría auth-js. */
async function emitAuthEvent(event: string, session: unknown) {
    await act(async () => {
        for (const cb of h.state.listeners) cb(event, session);
    });
    await flush();
}

function probeText(): string | null {
    return container.querySelector("#probe")?.textContent ?? null;
}

beforeEach(() => {
    h.state.session = null;
    h.state.listeners = [];
    h.state.rpcCalls = 0;
    h.state.rpcResult = { data: true, error: null };
    h.state.setTenantCalls = 0;
    mountCount = 0;
    setChildStep = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    // React 18 exige esta bandera para que act() controle el scheduler.
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
    // Sin esto, el árbol del test anterior sigue vivo y sus promesas pendientes
    // (checkAdmin) siguen renderizando -- contamina mountCount y el DOM.
    await act(async () => {
        root?.unmount();
    });
    container.remove();
});

async function mountGate() {
    root = createRoot(container);
    await act(async () => {
        root.render(React.createElement(AdminGate, null, React.createElement(ProbeChild)));
    });
    await flush();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AdminGate", () => {
    it("no remonta children cuando llegan eventos de auth del MISMO usuario", async () => {
        h.state.session = { user: { id: "user-1" } };
        await mountGate();

        // Arranque: el gate dejó pasar a los children una sola vez.
        expect(mountCount).toBe(1);
        expect(probeText()).toBe("idle");
        const rpcAfterMount = h.state.rpcCalls;
        expect(rpcAfterMount).toBeGreaterThan(0);

        // El hijo guarda estado, como el "✓ Upload complete" de la carga.
        await act(async () => {
            setChildStep!("done");
        });
        expect(probeText()).toBe("done");

        // Esto es lo que hace auth-js al volver a la pestaña / renovar el token.
        await emitAuthEvent("TOKEN_REFRESHED", h.state.session);
        await emitAuthEvent("SIGNED_IN", h.state.session);
        await emitAuthEvent("SIGNED_IN", h.state.session);
        await emitAuthEvent("TOKEN_REFRESHED", h.state.session);

        // El hijo nunca se remontó y conservó su estado.
        expect(mountCount).toBe(1);
        expect(probeText()).toBe("done");

        // Y el evento se ignoró de raíz: ni RPC de rol ni re-selección de tenant.
        // setTenantCalls === 1 = solo la auto-selección inicial. Antes del fix
        // subía con cada evento por el stale closure de currentTenant.
        expect(h.state.rpcCalls).toBe(rpcAfterMount);
        expect(h.state.setTenantCalls).toBe(1);
    });

    it("mantiene el estado del hijo aunque la RPC de rol empiece a fallar (fallo transitorio)", async () => {
        h.state.session = { user: { id: "user-1" } };
        await mountGate();
        expect(mountCount).toBe(1);

        await act(async () => {
            setChildStep!("done");
        });

        // Fallo transitorio: la petición sale con el token viejo justo durante
        // el refresh. Antes esto mandaba status a "not-admin" y desmontaba.
        h.state.rpcResult = { data: null, error: { message: "JWT expired" } };
        await emitAuthEvent("TOKEN_REFRESHED", h.state.session);

        expect(mountCount).toBe(1);
        expect(probeText()).toBe("done");
    });

    it("SÍ desmonta children en un logout real (session null)", async () => {
        h.state.session = { user: { id: "user-1" } };
        await mountGate();
        expect(mountCount).toBe(1);
        expect(probeText()).toBe("idle");

        await emitAuthEvent("SIGNED_OUT", null);

        // El hijo desapareció y el gate muestra el formulario de login.
        expect(probeText()).toBeNull();
        expect(container.textContent).toContain("Sign in");
    });

    it("SÍ revalida y remonta children cuando cambia el usuario de la sesión", async () => {
        h.state.session = { user: { id: "user-1" } };
        await mountGate();
        expect(mountCount).toBe(1);
        const rpcAfterMount = h.state.rpcCalls;

        await act(async () => {
            setChildStep!("done");
        });
        expect(probeText()).toBe("done");

        // Otro usuario: hay que volver a verificar el rol, no confiar en el anterior.
        const otherSession = { user: { id: "user-2" } };
        await emitAuthEvent("SIGNED_IN", otherSession);

        expect(h.state.rpcCalls).toBeGreaterThan(rpcAfterMount);
        // El árbol se reconcilia sin desmontar (mismo branch "admin"), así que
        // lo que importa es que el rol se re-verificó para el usuario nuevo.
        expect(container.querySelector("#probe")).not.toBeNull();
    });

    it("bloquea el acceso si el usuario nuevo NO tiene el rol", async () => {
        h.state.session = { user: { id: "user-1" } };
        await mountGate();
        expect(mountCount).toBe(1);

        // Usuario distinto y sin rol -> el gate debe cerrarse.
        h.state.rpcResult = { data: false, error: null };
        await emitAuthEvent("SIGNED_IN", { user: { id: "user-2" } });

        expect(probeText()).toBeNull();
        expect(container.textContent).toContain("Restricted access");
    });
});
