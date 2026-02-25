import { create } from 'zustand';
import { setTenantSession } from '@/lib/database';

interface SessionState {
    tenant_id: string | null;
    session_id: string | null;
    user_ide: string | null;
    user_name: string | null;
    setTenant: (tenant_id: string) => Promise<void>;
    clearSession: () => void;
    initSession: (user_ide: string, user_name: string) => void;
}

export const useSessionStore = create<SessionState>()(
    (set) => ({
        tenant_id: null,
        session_id: null,
        user_ide: null,
        user_name: null,

        setTenant: async (tenant_id: string) => {
            await setTenantSession(tenant_id);
            set({ tenant_id });
        },

        clearSession: () => {
            setTenantSession(null);
            set({
                tenant_id: null,
                session_id: null,
                user_ide: null,
                user_name: null
            });
        },

        initSession: (user_ide: string, user_name: string) => {
            set((state) => ({
                user_ide,
                user_name,
                session_id: state.session_id || crypto.randomUUID()
            }));
        }
    })
);
