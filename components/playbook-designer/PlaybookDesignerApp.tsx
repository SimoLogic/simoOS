"use client";

/**
 * ============================================================================
 * PLAYBOOK DESIGNER — MAIN ORCHESTRATOR COMPONENT
 * ============================================================================
 * Source: Supporting Documents/APP_PLAYBOOK DESIGNER/Playbook Designer app_Code.MD
 * Version: 20 (BPMN White Edition)
 *
 * ATOMIC GOVERNANCE & FIDELITY MANIFESTO:
 * 1. DRAG & DROP GOVERNANCE:
 *    - Step Reordering: Nodes can be dragged to change chronological order.
 *    - Owners: Multi-select cumulative from library.
 *    - Stakeholder: 1:1 strict replacement.
 * 2. VISUAL STATE LOGIC:
 *    - Activity Type Square: Black while editing, Gray when saved.
 *    - Activity Detail Text: Black while editing, Vibrant Amber when saved.
 *    - Description Modals: Fully disabled/Read-only when the step is locked.
 * 3. PROCESS FLOW INSPECTOR (STATE-OF-THE-ART BPMN UX):
 *    - Background: Corporate White canvas for max contrast.
 *    - Palette: Descending analogous harmony (Violet→Indigo→Blue→Cyan→Teal→Emerald).
 *    - BPMN Logic: Clear differentiation of User Tasks, Data Objects, Timers, End Events.
 *    - Tandem: Contingency modeled as exception flow (dashed line downwards).
 *    - Expansion: Zero-scroll, click-to-reveal descriptions natively integrated.
 * 4. SYSTEM INTEGRITY:
 *    - Language: 100% English.
 *    - UID Isolation: Hard generation on clone.
 *
 * US-001: Create Playbook with metadata (name, type, strategy, family, mission).
 * US-002: Add operational nodes (steps) with full activity metadata.
 * US-003: Lock/save a step to protect it from accidental edits (Shield Protocol).
 * US-004: Mark step as Repeatable → promotes to Library.
 * US-005: Drag-and-drop roles/types from Library onto steps.
 * US-006: View BPMN Flow Inspector for any locked step.
 * US-007: Reorder steps via drag-and-drop (unlocked steps only).
 * US-008: Receive warnings before destructive/integrity actions.
 * US-009: Edit rich text descriptions in a modal (read-only when locked).
 * ============================================================================
 */

import React, { useState, useRef } from 'react';
import {
  Settings, Save, GitBranch, Layers, Zap, Edit2,
} from 'lucide-react';
import {
  PlaybookStep, PlaybookState, PlaybookOwner,
  PlaybookType, PlaybookFamily, PlaybookStrategy, PlaybookStatus, ActiveTab,
  WarningModalState, ReplaceModalState, DescModalState, OverwriteWarningState,
  FrequencyOption, EmployeeRef
} from './types';
import { useTenant } from '@/lib/tenant-context';
import {
  upsertPlaybookAction,
  upsertPlaybookStepsAction,
  getPlaybooksAction,
  getPlaybookDetailAction,
  getActiveRoleTitlesForPlaybookAction,
  getActiveExternalRolesAction,
  getActiveEmployeesForPlaybookAction,
  checkPlaybookNameAction,
} from '@/app/actions/business-plan-actions';
import { MetadataField } from './SubComponents';
import { EditorArea, injectedStyles } from './EditorArea';
import { LibraryAssets } from './LibraryAssets';
import { FlowInspectorBPMN } from './FlowInspectorBPMN';
import { WarningModal, SystemModal, DescriptionModal } from './Modals';
import { ExternalRoleSettingsModal } from './ExternalRoleSettingsModal';
import { usePlaybookSchedule } from './usePlaybookSchedule';

// ─── UID Generator ────────────────────────────────────────────────────────────

const generateUID = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ─── Static Reference Data ────────────────────────────────────────────────────

const frequencyOptions: FrequencyOption[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const activityLibrary = [
  { type: 'CALL', options: ['Cold call to new realtor', 'Follow-up previous meeting', 'Mortgage quote follow-up'] },
  { type: 'EMAIL', options: ['Initial intro campaign', 'Optimized follow-up', 'Quote delivery email'] },
];
// ─── Default Playbook State ───────────────────────────────────────────────────

const defaultStep: PlaybookStep = {
  id: 1,
  uid: 'HBT032',
  stepNum: '01',
  name: 'COLD CALL TO NEW REALTOR',
  typeOfActivity: 'CALL',
  purpose: 'Align sales pitch with the commercial strategy.',
  activityDescription: 'Professional pitch following SIMO standards for cold reaching.',
  deliverable: 'RETENTION QUIZ',
  deliverableDescription: 'A 5-question form to validate information retention.',
  stakeholderId: null,
  stakeholderName: null,
  frequency: 'DAILY',
  repetitions: 8,
  freqNotes: 'Execution window between 9:00 AM and 11:00 AM EST.',
  schedulerValue: 0,
  supportingTask: 'MICRO-VIDEO PRODUCTION',
  counteractionDescription: 'If calls fail to convert, produce a micro-video summary.',
  requestedToId: null,
  requestedToName: null,
  sla: 'MIN 5 CALLS',
  slaDescription: 'Minimum of 5 documented calls per total proposed per session.',
  isLocked: true,
  isRepeatable: false,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlaybookDesignerAppProps {
  /** When set: Designer loads this specific playbook (Edit mode) */
  initialPlaybookId?: string | null;
  /** When set: Designer clones this playbook (Duplicate mode — user can rename) */
  duplicateFromId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PlaybookDesignerApp: React.FC<PlaybookDesignerAppProps> = ({
  initialPlaybookId = null,
  duplicateFromId = null,
}) => {
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const tenantId = currentTenant?.tenant_id ?? '';
  const isDuplicateMode = !!duplicateFromId;

  // ── Persistence State ──
  const [playbookId, setPlaybookId] = useState<string | null>(null);
  const [playbookVersion, setPlaybookVersion] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false); // true = unsaved changes exist
  // Anchor date for WorkdayHelper projections — editable by user
  const [playbookStartDate, setPlaybookStartDate] = useState<Date>(() => new Date());

  // ── Playbook Metadata ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [playbookName, setPlaybookName] = useState('NEW PLAYBOOK');
  const [isEditingName, setIsEditingName] = useState(false);
  const [playbookType, setPlaybookType] = useState<PlaybookType>('GROWTH');
  const [playbookFamily, setPlaybookFamily] = useState<PlaybookFamily>('COMMERCIAL');
  const [playbookStrategy, setPlaybookStrategy] = useState<PlaybookStrategy>('B2B');
  const [playbookPurpose, setPlaybookPurpose] = useState('');
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [status, setStatus] = useState<PlaybookStatus>('DRAFT');

  // ── Playbook Content ──
  const [activePB, setActivePB] = useState<PlaybookState>({
    globalOwners: [],
    steps: [defaultStep],
  });
  const [repeatableActivities, setRepeatableActivities] = useState<PlaybookStep[]>([]);
  const [internalRoles, setInternalRoles] = useState<PlaybookOwner[]>([]);
  const [externalRoles, setExternalRoles] = useState<PlaybookOwner[]>([]);
  const [employeeList, setEmployeeList] = useState<EmployeeRef[]>([]);

  // ── Modal States ──
  const [showExternalRolesModal, setShowExternalRolesModal] = useState(false);

  const [warningModal, setWarningModal] = useState<WarningModalState>({
    open: false, type: '', data: null, message: '', title: '',
  });
  const [replaceModal, setReplaceModal] = useState<ReplaceModalState>({
    open: false, targetId: null, sourceData: null,
  });
  const [descModal, setDescModal] = useState<DescModalState>({
    open: false, stepId: null, field: '', title: '', value: '', isLocked: false,
  });
  const [flowInspectorStep, setFlowInspectorStep] = useState<PlaybookStep | null>(null);
  // Name collision modal for overwrite protection
  const [overwriteWarning, setOverwriteWarning] = useState<OverwriteWarningState>({
    open: false, conflictingName: '', nextVersion: 2, onConfirm: () => {},
  });

  const refreshData = async () => {
    if (!tenantId) return;
    const [intRoles, extRoles, emps] = await Promise.all([
      getActiveRoleTitlesForPlaybookAction(tenantId),
      getActiveExternalRolesAction(tenantId),
      getActiveEmployeesForPlaybookAction(tenantId)
    ]);
    const mappedInt = intRoles.map(r => ({ id: r.id, name: r.role_title }));
    const mappedExt = extRoles.filter(r => r.status === 'Active').map(r => ({ id: r.id, name: r.name }));
    setInternalRoles(mappedInt);
    setExternalRoles(mappedExt);
    setEmployeeList(emps.map((e: any) => ({
      id: e.eid,
      name: `${e.primer_nombre} ${e.primer_apellido}`,
      role: e.role_title
    })));
    return { intRoles: mappedInt, extRoles: mappedExt };
  };

  // ── Deep Fetch: load specific or latest playbook on mount ──
  React.useEffect(() => {
    if (!tenantId || tenantLoading) return;
    const load = async () => {
      // Fetch Roles first — refreshData returns { intRoles, extRoles }
      const roleData = await refreshData();
      const intRoles = roleData?.intRoles ?? [];
      const extRoles = roleData?.extRoles ?? [];
      const resolveRoleName = (id: string | null) => {
        if (!id) return null;
        const found = intRoles.find(r => r.id === id) || extRoles.find(r => r.id === id);
        return found ? found.name : null;
      };

      // Determine which playbook ID to load
      const targetId = initialPlaybookId || duplicateFromId || null;

      let detail: Record<string, unknown> | null = null;

      if (targetId) {
        // Load specific playbook (Edit or Duplicate mode)
        detail = await getPlaybookDetailAction(targetId, tenantId);
      } else {
        // No targetId: Designer opens blank (ready for new playbook creation)
        // Do NOT load any existing playbook
        return;
      }

      if (!detail) return;

      setPlaybookName((detail.name as string) ?? 'NEW PLAYBOOK');
      setPlaybookType((detail.type as PlaybookType) ?? 'GROWTH');
      setPlaybookFamily((detail.family as PlaybookFamily) ?? 'COMMERCIAL');
      setPlaybookStrategy((detail.strategy as PlaybookStrategy) ?? 'B2B');
      setPlaybookPurpose((detail.purpose as string) ?? '');

      // In Duplicate mode: clear ID, append COPY, reset version/status
      if (isDuplicateMode) {
        setPlaybookId(null);
        setPlaybookName(`${((detail.name as string) ?? 'PLAYBOOK')} COPY`);
        setStatus('DRAFT');
        setPlaybookVersion(1);
      } else {
        setPlaybookId(detail.id as string);
        setStatus((detail.status as PlaybookStatus) ?? 'DRAFT');
        setPlaybookVersion((detail.version as number) ?? 1);
      }

      const hydratedSteps: PlaybookStep[] = ((detail.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? String(Date.now()),
        uid: s.uid as string,
        stepNum: s.step_num as string,
        name: s.name as string,
        typeOfActivity: (s.type_of_activity as string) ?? '',
        purpose: (s.purpose as string) ?? '',
        activityDescription: (s.activity_description as string) ?? '',
        deliverable: (s.deliverable as string) ?? '',
        deliverableDescription: (s.deliverable_description as string) ?? '',
        stakeholderId: (s.stakeholder_id as string) ?? null,
        stakeholderName: resolveRoleName((s.stakeholder_id as string) ?? null),
        frequency: (s.frequency as FrequencyOption) ?? 'DAILY',
        repetitions: (s.repetitions as number) ?? 1,
        freqNotes: (s.freq_notes as string) ?? '',
        schedulerValue: (s.scheduler_value as number) ?? 0,
        supportingTask: (s.supporting_task as string) ?? '',
        counteractionDescription: (s.counteraction_description as string) ?? '',
        requestedToId: (s.requested_to_id as string) ?? null,
        requestedToName: resolveRoleName((s.requested_to_id as string) ?? null),
        sla: (s.sla as string) ?? '',
        slaDescription: (s.sla_description as string) ?? '',
        isLocked: (s.is_locked as boolean) ?? false,
        isRepeatable: (s.is_repeatable as boolean) ?? false,
      }));

      // Map Global Owners UUID string[] to PlaybookOwner[]
      const mappedGlobalOwners = ((detail.global_owner_ids as string[]) ?? []).map((gid: string) => ({
         id: gid,
         name: resolveRoleName(gid) ?? 'Unknown Role'
      }));

      setActivePB({
        globalOwners: mappedGlobalOwners,
        steps: hydratedSteps.length > 0 ? hydratedSteps : activePB.steps,
      });
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, initialPlaybookId, duplicateFromId]);

  // ── WorkdayHelper Schedule Map (Llave #2) ──
  // Cascading projection: each step's date = previous step date + schedulerValue workdays
  const stepSchedule = usePlaybookSchedule({
    steps: activePB.steps,
    startDate: playbookStartDate,
    tenantCountry: 'US',
    userCountry: 'CO',
    timezone: 'America/Bogota',
  });

  // ── Drag Refs (Step Reordering) ──
  const dragItemIdx = useRef<number | null>(null);
  const dragOverItemIdx = useRef<number | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStepUpdate = (stepId: number | string, field: keyof PlaybookStep, value: PlaybookStep[keyof PlaybookStep]) => {
    setActivePB(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s),
    }));
    setIsDirty(true);
  };

  const handleReorderSteps = () => {
    if (
      dragItemIdx.current !== null &&
      dragOverItemIdx.current !== null &&
      dragItemIdx.current !== dragOverItemIdx.current
    ) {
      const newList = [...activePB.steps];
      const draggedItem = newList.splice(dragItemIdx.current, 1)[0];
      newList.splice(dragOverItemIdx.current, 0, draggedItem);
      const sequenced = newList.map((step, index) => ({
        ...step,
        stepNum: String(index + 1).padStart(2, '0'),
      }));
      setActivePB(prev => ({ ...prev, steps: sequenced }));
      setIsDirty(true);
    }
    dragItemIdx.current = null;
    dragOverItemIdx.current = null;
  };

  const handleDropGlobalOwner = (role: PlaybookOwner) => {
    if (role && !activePB.globalOwners.some(r => String(r.id) === String(role.id))) {
      setActivePB(prev => ({ ...prev, globalOwners: [...prev.globalOwners, role] }));
      setIsDirty(true);
    }
  };

  const handleRemoveGlobalOwner = (roleId: string) => {
    setActivePB(prev => ({ ...prev, globalOwners: prev.globalOwners.filter(r => String(r.id) !== String(roleId)) }));
    setIsDirty(true);
  };

  /**
   * US-003: Lock Toggle — Shield Protocol
   * If step isLocked AND isRepeatable → warn about edit sync desync before unlocking.
   */
  const handleLockToggle = (stepId: number | string) => {
    const step = activePB.steps.find(s => s.id === stepId);
    if (!step) return;
    if (step.isLocked && step.isRepeatable) {
      setWarningModal({
        open: true, type: 'edit_warning', data: step,
        title: "Edit Warning",
        message: "Local changes will not be synchronized with the library source.",
      });
    } else {
      handleStepUpdate(stepId, 'isLocked', !step.isLocked);
    }
  };

  /**
   * US-004: Repeatable Toggle
   * Must be locked (saved) before promoting to library.
   */
  const toggleRepeatable = (step: PlaybookStep) => {
    if (!step.isRepeatable) {
      if (!step.isLocked) {
        setWarningModal({
          open: true, type: 'alert', data: step,
          title: "Action Required",
          message: "Save first before promoting to library.",
        });
        return;
      }
      handleStepUpdate(step.id, 'isRepeatable', true);
      setRepeatableActivities(prev => [...prev, { ...JSON.parse(JSON.stringify(step)), isRepeatable: true }]);
    } else {
      setWarningModal({
        open: true, type: 'uncheck', data: step,
        title: "Integrity Warning",
        message: "This activity will be removed from library.",
      });
    }
  };

  const confirmUncheck = (step: PlaybookStep) => {
    handleStepUpdate(step.id, 'isRepeatable', false);
    setRepeatableActivities(prev => prev.filter(a => a.uid !== step.uid));
    setWarningModal({ open: false, type: '', data: null, message: '', title: '' });
  };

  /**
   * US-005: Replace via Drag (UID isolation on clone)
   */
  const handleReplaceConfirm = () => {
    if (replaceModal.targetId === null || !replaceModal.sourceData) return;
    const { targetId, sourceData } = replaceModal;
    setActivePB(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === targetId ? {
        ...JSON.parse(JSON.stringify(sourceData)),
        id: targetId,
        uid: generateUID(), // Hard UID isolation on clone
        stepNum: s.stepNum,
        schedulerValue: s.schedulerValue,
        isRepeatable: false,
        isLocked: true,
      } : s),
    }));
    setReplaceModal({ open: false, targetId: null, sourceData: null });
  };

  /**
   * Persist to DB: Upsert playbook header + all steps.
   * Handles Draft saves, Publish (with auto-versioning), and name-collision check.
   */
  const handleSaveToDB = async (publish: boolean = false, forceVersion?: number): Promise<string | null> => {
    if (!tenantId) return null;
    setIsSaving(true);
    try {
      let saveName = playbookName; // mutable copy for auto-suffix

      // Name collision check
      if (isDuplicateMode || !playbookId) {
        const nameCheck = await checkPlaybookNameAction(saveName, tenantId, playbookId ?? undefined);
        if (nameCheck.exists) {
          if (isDuplicateMode) {
            // In duplicate mode: show overwrite warning for user to decide
            const nextVer = (nameCheck.currentVersion ?? 1) + 1;
            setOverwriteWarning({
              open: true,
              conflictingName: saveName,
              nextVersion: nextVer,
              onConfirm: async () => {
                setOverwriteWarning(prev => ({ ...prev, open: false }));
                await handleSaveToDB(publish, nextVer);
              },
            });
            setIsSaving(false);
            return null;
          } else {
            // For new playbooks: auto-resolve by appending a unique suffix
            const suffix = Date.now().toString(36).toUpperCase().slice(-4);
            saveName = `${saveName} ${suffix}`;
            setPlaybookName(saveName);
          }
        }
      }

      // Determine version
      let nextVersion = forceVersion ?? playbookVersion;
      if (publish && status === 'PUBLISHED' && !forceVersion) {
        if (isDirty) {
          nextVersion = playbookVersion + 1;
        }
      }

      const headerData = {
        id: playbookId ?? undefined,
        name: saveName,
        type: playbookType,
        family: playbookFamily,
        strategy: playbookStrategy,
        purpose: playbookPurpose,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        globalOwners: activePB.globalOwners.map(o => o.id),
        version: nextVersion,
        parentId: isDuplicateMode ? (duplicateFromId ?? null) : undefined,
      };

      const savedPlaybook = await upsertPlaybookAction(tenantId, headerData);

      // Check for error returned from server action (not thrown — production-safe)
      if ('error' in savedPlaybook && savedPlaybook.error) {
        alert(`Save failed: ${savedPlaybook.error}`);
        setIsSaving(false);
        return null;
      }

      const id = savedPlaybook.id!;
      setPlaybookId(id);
      setPlaybookVersion(nextVersion);

      const stepsResult = await upsertPlaybookStepsAction(
        tenantId,
        id,
        // Recalculate stepNum from real position to fix non-consecutive numbering
        activePB.steps.map((s, idx) => ({
          ...s,
          id: undefined,
          position: idx,
          stepNum: String(idx + 1).padStart(2, '0'),
        }))
      );

      if (stepsResult.error) {
        alert(`Steps save failed: ${stepsResult.error}`);
        // header was saved, steps failed — don't wipe the playbookId
        setIsSaving(false);
        return id;
      }

      setLastSaved(new Date());
      setIsDirty(false); // Reset dirty flag after successful save
      if (publish) setStatus('PUBLISHED');
      else if (status !== 'PUBLISHED') setStatus('DRAFT');
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PlaybookDesigner] Save failed:', msg);
      alert(`Save failed (unexpected): ${msg}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStep = () => {
    setActivePB(p => ({
      ...p,
      steps: [...p.steps, {
        id: Date.now(),
        uid: generateUID(),
        stepNum: String(p.steps.length + 1).padStart(2, '0'),
        name: 'NEW ACTIVITY',
        typeOfActivity: '',
        purpose: '',
        activityDescription: '',
        deliverable: '',
        deliverableDescription: '',
        stakeholderId: null,
        stakeholderName: null,
        frequency: 'DAILY',
        repetitions: 1,
        freqNotes: '',
        schedulerValue: 0,
        supportingTask: '',
        counteractionDescription: '',
        requestedToId: null,
        requestedToName: null,
        sla: 'SLA',
        slaDescription: '',
        isLocked: false,
        isRepeatable: false,
      }],
    }));
    setIsDirty(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden w-full relative">
      {/* CSS for micro font sizes and scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: injectedStyles }} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ==================== HEADER ==================== */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 z-20 shadow-sm">
          <div className="flex justify-between items-start mb-3">

            {/* BRAND */}
            <div className="flex items-center gap-2 pr-6 border-r border-slate-100 h-12 shrink-0 text-slate-900">
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Zap size={16} fill="currentColor" />
              </div>
              <span className="font-black text-sm uppercase tracking-tighter">Playbook Designer</span>
            </div>

            {/* METADATA GRID */}
            <div className="flex-1 max-w-xl mx-6 border border-slate-200 rounded-xl p-2.5 bg-slate-50/40 shadow-inner grid grid-cols-2 gap-x-6 gap-y-1.5">
              <MetadataField label="TYPE" value={playbookType} onChange={v => setPlaybookType(v as PlaybookType)} options={['CORE', 'GROWTH', 'ELITE']} />
              <MetadataField label="STRATEGY" value={playbookStrategy} onChange={v => setPlaybookStrategy(v as PlaybookStrategy)} options={['B2B', 'B2C', 'NPPM']} />
              <MetadataField label="FAMILY" value={playbookFamily} onChange={v => setPlaybookFamily(v as PlaybookFamily)} options={['COMMERCIAL', 'OPERATIONAL']} />
              <div className="flex items-center justify-between gap-2">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">MISSION:</label>
                <button
                  onClick={() => setShowPurposeModal(true)}
                  className="flex items-center gap-1 px-3 text-[7px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 bg-white rounded uppercase h-5 justify-center transition-all shadow-sm"
                >
                  PURPOSE
                </button>
              </div>
            </div>

            {/* STATUS & SETTINGS */}
            <div className="flex items-center gap-6 pl-6 border-l border-slate-100 shrink-0 h-12 text-slate-900">
              <div className="flex flex-col text-right">
                <label className="text-[6px] font-black text-slate-300 uppercase tracking-tighter">DESIGNER</label>
                <p className="text-[8px] font-bold text-slate-500 uppercase">SIMO INTELLISENSE (ORG-001)</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase ${
                status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                status === 'INACTIVE' ? 'bg-slate-100 text-slate-400 border-slate-200' :
                'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
                {status === 'PUBLISHED' ? `ACTIVE v${playbookVersion}` : status}
              </div>
              <Settings 
                size={14} 
                className="text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors" 
                onClick={() => setShowExternalRolesModal(true)} 
              />
            </div>
          </div>

          {/* PLAYBOOK NAME + ACTIONS */}
          <div className="flex items-center justify-between border-t border-slate-50 pt-2 relative text-slate-800">
            <div className="flex items-center gap-2 flex-1 group text-slate-900">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NAME:</label>
              {isEditingName ? (
                <input
                  value={playbookName}
                  onChange={e => { setPlaybookName(e.target.value.toUpperCase()); setIsDirty(true); }}
                  onBlur={() => setIsEditingName(false)}
                  className="text-sm font-black uppercase outline-none bg-transparent border-b border-indigo-500 flex-1 py-1"
                  autoFocus
                />
              ) : (
                <h1 className="text-sm font-black uppercase truncate flex-1 leading-none">{playbookName}</h1>
              )}
              <button onClick={() => setIsEditingName(!isEditingName)} className="p-1 text-slate-300 hover:text-indigo-600 transition-all">
                <Edit2 size={12} />
              </button>
            </div>
            <div className="flex gap-2 ml-8 shrink-0">
              <button className="px-4 py-1.5 bg-white border border-slate-200 rounded font-black text-[9px] text-slate-400 uppercase hover:bg-slate-50 transition-colors shadow-sm">
                DRAFT
              </button>
              <button
                onClick={() => handleSaveToDB(false)}
                disabled={isSaving || !tenantId}
                className="px-4 py-1.5 bg-white border border-indigo-200 rounded font-black text-[9px] text-indigo-500 uppercase hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-40"
              >
                {isSaving ? 'SAVING...' : lastSaved ? `SAVED ${lastSaved.toLocaleTimeString()}` : 'SAVE DRAFT'}
              </button>
              <button
                onClick={() => handleSaveToDB(true)}
                disabled={isSaving || !tenantId}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded font-black text-[10px] shadow-md uppercase hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
              >
                <Save size={14} /> {isSaving ? 'PUBLISHING...' : 'SAVE & PUBLISH'}
              </button>
            </div>
          </div>
        </header>

        {/* ==================== TABS ==================== */}
        <div className="bg-white border-b border-slate-100 px-8 flex gap-10 shrink-0 z-10">
          {(['RECIPE EDITOR', 'VISUAL MAP'] as const).map(tab => {
            const tabKey = tab === 'RECIPE EDITOR' ? 'editor' : 'visual';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabKey)}
                className={`py-4 px-1 flex items-center gap-2 text-[9px] font-black transition-all relative uppercase tracking-[0.15em] ${activeTab === tabKey ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
              >
                {tab === 'RECIPE EDITOR' ? <Layers size={14} /> : <GitBranch size={14} />} {tab}
                {activeTab === tabKey && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.3)]"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* ==================== EDITOR AREA ==================== */}
        <div className="flex-1 overflow-auto p-5 relative bg-slate-50/20 pb-scrollbar">
          {activeTab === 'editor' && (
            <EditorArea
              playbook={activePB}
              onUpdate={handleStepUpdate}
              onLock={handleLockToggle}
              onRepeat={toggleRepeatable}
              onReplace={(t, s) => setReplaceModal({ open: true, targetId: t, sourceData: s })}
              onAddOwner={handleDropGlobalOwner}
              onRemoveOwner={handleRemoveGlobalOwner}
              onOpenDesc={(step, field, title) => setDescModal({
                open: true, stepId: step.id, field, title, value: step[field as keyof PlaybookStep] as string || '', isLocked: step.isLocked,
              })}
              onOpenFlow={step => setFlowInspectorStep(step)}
              dragItemIdx={dragItemIdx}
              dragOverItemIdx={dragOverItemIdx}
              handleReorderSteps={handleReorderSteps}
              freqOptions={frequencyOptions}
              roles={[...internalRoles, ...externalRoles]}
              empList={employeeList}
              lib={activityLibrary}
              onAdd={handleAddStep}
              stepSchedule={stepSchedule}
            />
          )}
          {activeTab === 'visual' && (
            <div className="h-full flex items-center justify-center p-20 text-slate-400">
              <div className="text-center space-y-4">
                <GitBranch size={48} className="mx-auto text-indigo-200" />
                <p className="text-xs font-black uppercase tracking-widest text-center">Global Visual Strategy Map Loading...</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================== LIBRARY SIDEBAR ==================== */}
      <LibraryAssets
        internalRoles={internalRoles}
        externalRoles={externalRoles}
        activityLibrary={activityLibrary}
        repeatableActivities={repeatableActivities}
      />

      {/* ==================== OVERLAYS ==================== */}

      {warningModal.open && (
        <WarningModal
          data={warningModal}
          onClose={() => setWarningModal({ ...warningModal, open: false })}
          onConfirm={() => warningModal.data && confirmUncheck(warningModal.data)}
        />
      )}

      {replaceModal.open && (
        <SystemModal
          title="CONFIRM REPLACEMENT"
          message="Isolation UID will be generated."
          type="confirm"
          onClose={() => setReplaceModal({ open: false, targetId: null, sourceData: null })}
          onConfirm={handleReplaceConfirm}
        />
      )}

      {(descModal.open || showPurposeModal) && (
        <DescriptionModal
          title={showPurposeModal ? "MISSION PURPOSE" : descModal.title}
          value={showPurposeModal ? playbookPurpose : descModal.value}
          isReadOnly={showPurposeModal ? false : descModal.isLocked}
          onSave={v => {
            if (showPurposeModal) {
              setPlaybookPurpose(v);
              setShowPurposeModal(false);
            } else {
              if (descModal.stepId !== null) {
                handleStepUpdate(descModal.stepId, descModal.field as keyof PlaybookStep, v);
              }
              setDescModal({ ...descModal, open: false });
            }
          }}
          onClose={() => showPurposeModal ? setShowPurposeModal(false) : setDescModal({ ...descModal, open: false })}
        />
      )}

      {flowInspectorStep && (
        <FlowInspectorBPMN
          step={flowInspectorStep}
          owners={activePB.globalOwners}
          employeeList={employeeList}
          playbookPurpose={playbookPurpose}
          onClose={() => setFlowInspectorStep(null)}
        />
      )}

      {showExternalRolesModal && (
        <ExternalRoleSettingsModal 
          onClose={() => setShowExternalRolesModal(false)}
          onUpdate={refreshData}
        />
      )}

      {/* ── Overwrite Warning Modal ── */}
      {overwriteWarning.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-600 text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Name Conflict Detected</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">A playbook with this name already exists.</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-xs text-amber-800 font-semibold">
                Saving <strong>&quot;{overwriteWarning.conflictingName}&quot;</strong> will create a new version:{' '}
                <span className="font-black text-amber-900">v{overwriteWarning.nextVersion}</span>
              </p>
              <p className="text-[10px] text-amber-600 mt-1 font-medium">
                The existing playbook will remain unchanged. This will be saved as a new version.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setOverwriteWarning(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest transition-all"
              >
                Cancel — Rename
              </button>
              <button
                onClick={overwriteWarning.onConfirm}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg"
              >
                Accept — Save as v{overwriteWarning.nextVersion}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate Mode Banner ── */}
      {isDuplicateMode && !playbookId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-700 animate-in slide-in-from-bottom duration-300">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Duplicate Mode</p>
            <p className="text-sm font-bold text-white">Change the playbook name, then Save Draft or Publish.</p>
          </div>
        </div>
      )}
    </div>
  );
};
