"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { Tenant } from "./tenant-types";
import { useSessionStore } from "./session-store";
import {
    getTenantByTcode,
    getActiveTenants,
} from "./tenant-store";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface TenantContextValue {
    currentTenant: Tenant | null;
    setCurrentTenantById: (tenant_id: string | null) => void;
    activeTenants: Tenant[];
    refreshTenants: () => void;
    hasAnyActiveTenant: boolean;
    // Broadcast system
    broadcastMessage: string | null;
    dismissBroadcast: () => void;
    currentModule: string;
    currentSubmodule: string;
    setCurrentModule: (module: string, submodule: string) => void;
    isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
    currentTenant: null,
    setCurrentTenantById: () => { },
    activeTenants: [],
    refreshTenants: () => { },
    hasAnyActiveTenant: false,
    broadcastMessage: null,
    dismissBroadcast: () => { },
    currentModule: "",
    currentSubmodule: "",
    setCurrentModule: () => { },
    isLoading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

const SESSION_DISPLAY_NAME = "Administrator"; // placeholder until real auth
const SESSION_IDE = "ADMIN-001";

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { tenant_id, setTenant, clearSession, initSession } = useSessionStore();
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [activeTenants, setActiveTenants] = useState<Tenant[]>([]);
    const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
    const [currentModule, setModuleState] = useState("Dashboard");
    const [currentSubmodule, setSubmoduleState] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Initial session setup
    useEffect(() => {
        initSession(SESSION_IDE, SESSION_DISPLAY_NAME);
    }, [initSession]);

    // sync currentTenant object when tenant_id changes
    useEffect(() => {
        const syncTenant = async () => {
            if (!tenant_id) {
                setCurrentTenant(null);
                return;
            }
            if (currentTenant?.tenant_id !== tenant_id) {
                const tenant = await getTenantByTcode(tenant_id);
                if (tenant) {
                    setCurrentTenant(tenant);
                } else {
                    // If tenant no longer exists or invalid, clear it
                    clearSession();
                }
            }
        };
        syncTenant();
    }, [tenant_id, currentTenant, clearSession]);

    // Load initial state
    const refreshTenants = useCallback(async () => {
        setIsLoading(true);
        try {
            const active = await getActiveTenants();
            setActiveTenants(active);

            // If current tenant was deactivated, clear it
            if (tenant_id && !active.find((t) => t.tenant_id === tenant_id)) {
                clearSession();
            }
        } finally {
            setIsLoading(false);
        }
    }, [tenant_id, clearSession]);

    useEffect(() => {
        refreshTenants();
    }, []); // Only once on mount

    // Listen for broadcast messages via storage event
    useEffect(() => {
        const BROADCAST_KEY = "hops-broadcast-message";
        const handleStorage = (e: StorageEvent) => {
            if (e.key === BROADCAST_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue) as { tenant_id: string; message: string; timestamp: string };
                    if (tenant_id === parsed.tenant_id) {
                        setBroadcastMessage(parsed.message);
                    }
                } catch { /* ignore */ }
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [tenant_id]);

    const setCurrentTenantById = useCallback(async (new_tenant_id: string | null) => {
        if (!new_tenant_id) {
            clearSession();
            return;
        }
        await setTenant(new_tenant_id);
    }, [setTenant, clearSession]);

    const setCurrentModule = useCallback((module: string, submodule: string) => {
        setModuleState(module);
        setSubmoduleState(submodule);
    }, []);

    const dismissBroadcast = () => setBroadcastMessage(null);

    return (
        <TenantContext.Provider
            value={{
                currentTenant,
                setCurrentTenantById,
                activeTenants,
                refreshTenants,
                hasAnyActiveTenant: activeTenants.length > 0,
                broadcastMessage,
                dismissBroadcast,
                currentModule,
                currentSubmodule,
                setCurrentModule,
                isLoading
            }}
        >
            {children}
        </TenantContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTenant = (): TenantContextValue => useContext(TenantContext);

// ─── Broadcast Helper (called by ActiveTenantApp deactivation) ────────────────

export const broadcastDeactivationAlert = (tenantId: string, tenantDba: string): void => {
    if (typeof window === "undefined") return;
    const payload = {
        tenant_id: tenantId,
        message: `System Notice: The administrator has requested deactivation of tenant "${tenantDba}". Please save your work and log out immediately.`,
        timestamp: new Date().toISOString(),
    };
    localStorage.setItem("hops-broadcast-message", JSON.stringify(payload));
};
