import { create } from "zustand";

export type PlaybookStepType = {
    id: string; // Temporarily generated UUID for UI if unsaved
    step_number: number;
    dictionary_activity_id: string | null;
    day_offset: number;
    owner_type: 'Internal' | 'External' | '';
    owner_job_title_id?: string | null;
    owner_external_role_id?: string | null;
    owner_employee_id?: string | null;
    deliverable_name: string;
    deliverable_description: string;
    stakeholder_type: 'Internal' | 'External' | '';
    stakeholder_job_title_id?: string | null;
    stakeholder_external_role_id?: string | null;
    stakeholder_employee_id?: string | null;
    iterations: number;
    frequency: string;
    source_of_truth_id?: string | null;
    contra_playbook_owner_id?: string | null;
    contra_activity_name?: string | null;
    contra_activity_purpose?: string | null;
};

export type PlaybookSlaType = {
    id: string;
    kpi_name: string;
    kpi_mnemonic_id: string;
    description: string;
    data_source_id: string | null;
    frequency: string;
    formula_definition: string;
    threshold_operator: string;
    threshold_value: string;
};

interface EditorState {
    playbookId: string | null;
    name: string;
    version: number;
    status: string;
    strategyId: string | null;
    playbookType: string;
    purpose: string;
    approver1Id: string | null;
    approver2Id: string | null;

    steps: PlaybookStepType[];
    slas: PlaybookSlaType[];

    // Actions
    setField: (field: string, value: any) => void;
    setSteps: (steps: PlaybookStepType[]) => void;
    addStep: (step: PlaybookStepType) => void;
    updateStep: (id: string, stepInfo: Partial<PlaybookStepType>) => void;
    removeStep: (id: string) => void;

    addSla: (sla: PlaybookSlaType) => void;
    removeSla: (id: string) => void;
    updateSla: (id: string, slaInfo: Partial<PlaybookSlaType>) => void;

    reset: () => void;
}

export const usePlaybookEditorStore = create<EditorState>((set) => ({
    playbookId: null,
    name: '',
    version: 1,
    status: 'Draft',
    strategyId: null,
    playbookType: 'Commercial',
    purpose: '',
    approver1Id: null,
    approver2Id: null,
    steps: [],
    slas: [],

    setField: (field, value) => set((state) => ({ ...state, [field]: value })),

    setSteps: (steps) => set({ steps }),
    addStep: (step) => set((state) => ({ steps: [...state.steps, step] })),
    updateStep: (id, stepInfo) => set((state) => ({
        steps: state.steps.map(s => s.id === id ? { ...s, ...stepInfo } : s)
    })),
    removeStep: (id) => set((state) => ({
        // Remove step and re-calculate step_numbers
        steps: state.steps
            .filter(s => s.id !== id)
            .sort((a, b) => a.step_number - b.step_number)
            .map((s, index) => ({ ...s, step_number: index + 1 }))
    })),

    addSla: (sla) => set((state) => ({ slas: [...state.slas, sla] })),
    removeSla: (id) => set((state) => ({ slas: state.slas.filter(s => s.id !== id) })),
    updateSla: (id, slaInfo) => set((state) => ({
        slas: state.slas.map(s => s.id === id ? { ...s, ...slaInfo } : s)
    })),

    reset: () => set({
        playbookId: null, name: '', version: 1, status: 'Draft', strategyId: null, playbookType: 'Commercial',
        purpose: '', approver1Id: null, approver2Id: null, steps: [], slas: []
    })
}));
