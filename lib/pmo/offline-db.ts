"use client";

import Dexie, { Table } from "dexie";
import { PmoTask } from "@/types/pmo.types";

/**
 * PMO OFFLINE DATABASE (Prompt #33)
 * Dual Continuity: Local persistence for offline work
 */
export class PmoOfflineDB extends Dexie {
    tasks!: Table<PmoTask & { syncStatus: 'synced' | 'pending' | 'failed' }>;

    constructor() {
        super("PmoOfflineDB");
        this.version(1).stores({
            tasks: "id, boardId, orgId, status, syncStatus"
        });
    }

    async saveTaskLocally(task: PmoTask) {
        return this.tasks.put({
            ...task,
            syncStatus: 'pending'
        });
    }

    async getPendingSync() {
        return this.tasks.where("syncStatus").equals("pending").toArray();
    }
}

export const offlineDB = typeof window !== "undefined" ? new PmoOfflineDB() : null;
