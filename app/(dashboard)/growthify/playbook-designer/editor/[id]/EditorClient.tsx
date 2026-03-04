"use client";

import { useEffect, useState } from "react";
import { usePlaybookEditorStore, PlaybookStepType } from "@/lib/store/playbook-editor-store";
import { savePlaybookDraft } from "@/lib/actions/playbook/editor";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, GripVertical, Settings, Trash2, Check, Clock, ChevronDown, User, FileText } from "lucide-react";
import { SlaBuilder } from "./SlaBuilder";

export function EditorClient({
    tenantId,
    initialData,
    dictionaries,
    isNew
}: {
    tenantId: string;
    initialData: any;
    dictionaries: any;
    isNew: boolean;
}) {
    const store = usePlaybookEditorStore();
    const [isSaving, setIsSaving] = useState(false);

    // Initialize Store on Mount
    useEffect(() => {
        if (!isNew && initialData) {
            store.setField('playbookId', initialData.id);
            store.setField('name', initialData.name);
            store.setField('playbookType', initialData.playbook_type);
            store.setField('purpose', initialData.purpose);
            store.setField('version', initialData.version);
            store.setField('status', initialData.status || 'Draft');
            store.setField('strategyId', initialData.strategy_id || null);
            store.setSteps(initialData.fact_playbook_step || []);
        } else {
            store.reset();
        }
    }, [isNew, initialData]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(store.steps);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Recalculate step_number linearly
        const updatedSteps = items.map((step, index) => ({
            ...step,
            step_number: index + 1
        }));
        store.setSteps(updatedSteps);
    };

    const handleAddStep = () => {
        store.addStep({
            id: crypto.randomUUID(),
            step_number: store.steps.length + 1,
            dictionary_activity_id: null,
            day_offset: store.steps.length === 0 ? 0 : 1, // First is day 0, next defaults to 1 day after
            owner_type: 'Internal',
            deliverable_name: '',
            deliverable_description: '',
            stakeholder_type: 'Internal',
            iterations: 1,
            frequency: 'Daily'
        });
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        const payload = {
            playbookId: store.playbookId,
            tenantId,
            name: store.name || 'Untitled Playbook',
            version: store.version,
            playbookType: store.playbookType,
            purpose: store.purpose,
            strategyId: store.strategyId,
            steps: store.steps,
            slas: store.slas,
            authorId: null // Real implementation: const { currentUser } = useTenant(); and pass currentUser.eid
        };

        const res = await savePlaybookDraft(payload);
        if (res.success && res.data) {
            store.setField('playbookId', res.data.id);
            alert('Draft saved successfully!');
        } else {
            alert('Error saving draft');
        }
        setIsSaving(false);
    };

    return (
        <div className="flex flex-1 flex-col lg:flex-row">

            {/* Left Panel: Properties / Meta */}
            <div className="w-full border-r border-gray-200 bg-white p-6 lg:w-80 lg:shrink-0">
                <div className="mb-6 space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playbook Properties</label>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Strategy Focus</label>
                        <select
                            value={store.strategyId || ''}
                            onChange={(e) => store.setField('strategyId', e.target.value)}
                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                        >
                            <option value="">Select Strategy...</option>
                            {dictionaries.strategies?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Playbook Name</label>
                        <input
                            type="text"
                            value={store.name}
                            onChange={(e) => store.setField('name', e.target.value)}
                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                            placeholder="e.g. B2B Outreach Campaign"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                        <select
                            value={store.playbookType}
                            onChange={(e) => store.setField('playbookType', e.target.value)}
                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                        >
                            <option value="Commercial">Commercial</option>
                            <option value="Operations">Operations</option>
                            <option value="Special">Special</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Purpose</label>
                        <textarea
                            value={store.purpose}
                            onChange={(e) => store.setField('purpose', e.target.value)}
                            rows={4}
                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                            placeholder="Define the goal of this strategy..."
                        />
                    </div>
                </div>
            </div>


            {/* Main Center Canvas: Activity Builder */}
            <div className="flex-1 overflow-auto bg-gray-50 p-6 relative">

                {/* Header Action Bar */}
                <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-3 text-[#002B5B]">
                            {store.name || 'Untitled Playbook'}
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${store.status === 'Draft' ? 'bg-amber-100 text-amber-800 border border-amber-200' : store.status === 'Submitted' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                                {store.status || 'Draft'}
                            </span>
                        </h1>
                        <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 border border-gray-200">
                                v{store.version.toString().padStart(3, '0')}
                            </span>
                            {store.steps.length} Protocol Steps
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-[#002B5B] shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button className="rounded-md bg-[#002B5B] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-[#002B5B]">
                            Submit for Approval
                        </button>
                    </div>
                </div>

                {/* DND Canvas List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="steps-list">
                        {(provided) => (
                            <div
                                className="space-y-4 pb-20"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {store.steps.map((step, index) => (
                                    <Draggable key={step.id} draggableId={step.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`rounded-xl border bg-white shadow-sm transition-shadow ${snapshot.isDragging ? 'border-[#002B5B] ring-1 ring-[#002B5B] shadow-lg' : 'border-gray-200'}`}
                                            >
                                                {/* Step Header */}
                                                <div className="flex items-center border-b border-gray-100 bg-gray-50 px-4 py-3">
                                                    <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none">
                                                        <GripVertical className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#002B5B] text-xs font-bold text-white">
                                                        {step.step_number}
                                                    </div>

                                                    <div className="ml-4 flex flex-1 items-center gap-4">
                                                        {/* Scheduler / Offset */}
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                            <Clock className="h-4 w-4 text-gray-400" />
                                                            <span>Day +</span>
                                                            <input
                                                                type="number"
                                                                min="0" max="60"
                                                                value={step.day_offset}
                                                                onChange={(e) => store.updateStep(step.id, { day_offset: parseInt(e.target.value) || 0 })}
                                                                className="w-12 rounded border p-1 text-center text-xs outline-none focus:border-[#002B5B]"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => store.removeStep(step.id)}
                                                        className="ml-auto text-gray-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                {/* Step Body (Form) */}
                                                <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2 lg:grid-cols-4">

                                                    {/* Activity Selector */}
                                                    <div className="col-span-1 lg:col-span-1 border-r border-gray-100 pr-4">
                                                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Activity</label>
                                                        <select
                                                            value={step.dictionary_activity_id || ''}
                                                            onChange={(e) => store.updateStep(step.id, { dictionary_activity_id: e.target.value })}
                                                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-blue-500"
                                                        >
                                                            <option value="">Select or Create...</option>
                                                            {dictionaries.activities?.map((a: any) => (
                                                                <option key={a.id} value={a.id}>{a.activity_name}</option>
                                                            ))}
                                                        </select>
                                                        <p className="mt-2 text-[10px] text-gray-400">Selected from Dictionary Pool</p>

                                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-500">Iters.</label>
                                                                <input type="number" value={step.iterations} onChange={e => store.updateStep(step.id, { iterations: +e.target.value })} className="w-full rounded border p-1 text-xs" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase text-gray-500">Freq.</label>
                                                                <select value={step.frequency} onChange={e => store.updateStep(step.id, { frequency: e.target.value })} className="w-full rounded border p-1 text-xs">
                                                                    <option>Hourly</option><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Per Semester</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3">
                                                            <label className="text-[10px] uppercase text-gray-500">Source of Truth</label>
                                                            <select
                                                                value={step.source_of_truth_id || ''}
                                                                onChange={(e) => store.updateStep(step.id, { source_of_truth_id: e.target.value })}
                                                                className="w-full rounded border p-1 text-xs outline-none focus:border-blue-500"
                                                            >
                                                                <option value="">System Select...</option>
                                                                {dictionaries.dataSources?.map((ds: any) => (
                                                                    <option key={ds.id} value={ds.id}>{ds.source_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Who is Doing It (Owner) */}
                                                    <div className="col-span-1 lg:col-span-1 border-r border-gray-100 pr-4">
                                                        <label className="mb-1 block flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                                                            <User className="h-3 w-3" /> Owner
                                                        </label>
                                                        <div className="mb-2 flex gap-1 rounded bg-gray-100 p-1">
                                                            <button
                                                                onClick={() => store.updateStep(step.id, { owner_type: 'Internal' })}
                                                                className={`flex-1 rounded p-1 text-xs ${step.owner_type === 'Internal' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
                                                            >Internal</button>
                                                            <button
                                                                onClick={() => store.updateStep(step.id, { owner_type: 'External' })}
                                                                className={`flex-1 rounded p-1 text-xs ${step.owner_type === 'External' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
                                                            >External</button>
                                                        </div>
                                                        <select
                                                            value={step.owner_type === 'Internal' ? (step.owner_employee_id || step.owner_job_title_id || '') : (step.owner_external_role_id || '')}
                                                            onChange={(e) => {
                                                                if (step.owner_type === 'Internal') {
                                                                    store.updateStep(step.id, { owner_employee_id: e.target.value, owner_job_title_id: null });
                                                                } else {
                                                                    store.updateStep(step.id, { owner_external_role_id: e.target.value });
                                                                }
                                                            }}
                                                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-blue-500">
                                                            <option value="">Select Role/Employee...</option>
                                                            {step.owner_type === 'Internal'
                                                                ? dictionaries.employees?.map((e: any) => <option key={e.eid} value={e.eid}>{e.first_name} {e.last_name} ({e.official_job_title})</option>)
                                                                : dictionaries.extRoles?.map((r: any) => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                                                        </select>
                                                    </div>

                                                    {/* Deliverable & Stakeholder */}
                                                    <div className="col-span-1 lg:col-span-1 border-r border-gray-100 pr-4">
                                                        <label className="mb-1 block flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                                                            <FileText className="h-3 w-3" /> Deliverable
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Email Sent, Signed Contract"
                                                            value={step.deliverable_name}
                                                            onChange={(e) => store.updateStep(step.id, { deliverable_name: e.target.value })}
                                                            className="mb-2 w-full rounded-md border p-2 text-sm outline-none focus:border-blue-500"
                                                        />

                                                        <label className="mb-1 mt-3 block flex items-center gap-1 text-xs font-semibold uppercase text-gray-500">
                                                            Stakeholder (Receives it)
                                                        </label>
                                                        <select
                                                            value={step.stakeholder_employee_id || ''}
                                                            onChange={(e) => store.updateStep(step.id, { stakeholder_employee_id: e.target.value, stakeholder_type: 'Internal' })}
                                                            className="w-full rounded-md border p-2 text-sm outline-none focus:border-blue-500">
                                                            <option value="">Select Employee...</option>
                                                            {dictionaries.employees?.map((e: any) => <option key={e.eid} value={e.eid}>{e.first_name} {e.last_name} ({e.official_job_title})</option>)}
                                                        </select>
                                                    </div>

                                                    {/* Contra-Playbook Assignee */}
                                                    <div className="col-span-1 lg:col-span-1 relative">
                                                        <label className="mb-1 block flex items-center justify-between text-xs font-semibold uppercase text-[#002B5B]">
                                                            Contra-Playbook
                                                            <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-800">Support</span>
                                                        </label>
                                                        <p className="mb-2 text-[10px] text-gray-500 leading-tight">Request an employee to execute tasks that enable this activity.</p>

                                                        <input
                                                            type="text"
                                                            placeholder="Contra Activity Name"
                                                            value={step.contra_activity_name || ''}
                                                            onChange={(e) => store.updateStep(step.id, { contra_activity_name: e.target.value })}
                                                            className="mb-2 w-full rounded-md border p-2 text-xs outline-none focus:border-[#002B5B]"
                                                        />
                                                        <select
                                                            value={step.contra_playbook_owner_id || ''}
                                                            onChange={(e) => store.updateStep(step.id, { contra_playbook_owner_id: e.target.value })}
                                                            className="mb-2 w-full rounded-md border p-2 text-xs outline-none focus:border-[#002B5B]"
                                                        >
                                                            <option value="">No support requested</option>
                                                            {dictionaries.employees?.map((e: any) => <option key={e.eid} value={e.eid}>{e.first_name} {e.last_name}</option>)}
                                                        </select>
                                                        <textarea
                                                            placeholder="Describe the contra-purpose..."
                                                            rows={2}
                                                            value={step.contra_activity_purpose || ''}
                                                            onChange={(e) => store.updateStep(step.id, { contra_activity_purpose: e.target.value })}
                                                            className="w-full rounded-md border p-2 text-xs outline-none focus:border-[#002B5B]"
                                                        />
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                {/* Empty State / Add Step Action */}
                                <button
                                    onClick={handleAddStep}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-500 transition-colors hover:border-[#002B5B] hover:text-[#002B5B] focus:outline-none"
                                >
                                    <Plus className="h-6 w-6" />
                                    <span className="font-medium">Add New Step</span>
                                </button>

                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* SLAs & KPIs Panel */}
                <SlaBuilder dictionaries={dictionaries} />
            </div>
        </div>
    );
}
