
export type PlaybookCategory = "commercial" | "supporting" | "special";

export interface PlaybookTask {
    id: string;
    label: string;
    description?: string;
    sla?: string; // e.g., "2h", "1d"
    medium?: string; // e.g., "Email", "Phone", "CRM"
    delivery?: string; // e.g., "Excel", "Confirmation"
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    category: PlaybookCategory;
    tasks: PlaybookTask[];
    kpis: string[];
    escalationMatrix?: string;
}

export interface BPWorkflowEntry {
    id: string; // Internal ID for the entry
    tenant_id: string;
    eid: string;
    fullName: string;
    area: string;
    directManager: string;
    commercialPlaybooks: string[]; // List of Playbook IDs
    supervisors1: string[]; // List of EIDs for supervisors 1-3
    supportingPlaybooks: string[]; // List of Playbook IDs
    supervisors2: string[]; // List of EIDs for supervisors 4-6
    specialPlaybooks: string[]; // List of Playbook IDs
    supervisors3: string[]; // List of EIDs for supervisors 7-9
    lastModified: string;
    modifiedBy: string;
}

export interface BPSupervisor {
    eid: string;
    fullName: string;
    role?: string;
}
