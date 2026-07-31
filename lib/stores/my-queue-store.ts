import { create } from 'zustand';
import { getPendingCountAction } from '@/lib/actions/my-queue-actions';

interface MyQueueStore {
    unreadCount: number;
    hasFetched: boolean;
    fetchUnreadCount: (tenantId: string, userId: string) => Promise<void>;
    decrementUnread: () => void;
}

export const useMyQueueStore = create<MyQueueStore>((set, get) => ({
    unreadCount: 0,
    hasFetched: false,

    fetchUnreadCount: async (tenantId: string, userId: string) => {
        // Only fetch once per session lifecycle effectively to save db calls,
        // or can be customized to poll
        const count = await getPendingCountAction(tenantId, userId);
        set({ unreadCount: count, hasFetched: true });
    },

    decrementUnread: () => {
        set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
    }
}));
