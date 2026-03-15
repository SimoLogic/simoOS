/**
 * ============================================================================
 * HOMESI PLAYBOOK DESIGNER - VERSION 20 (BPMN WHITE EDITION)
 * ============================================================================
 * ATOMIC GOVERNANCE & FIDELITY MANIFESTO:
 * 1. DRAG & DROP GOVERNANCE:
 * - Step Reordering: Nodes can be dragged to change chronological order.
 * - Owners: Multi-select cumulative from library.
 * - Stakeholder: 1:1 strict replacement.
 * 2. VISUAL STATE LOGIC:
 * - Activity Type Square: Black while editing, Gray when saved.
 * - Activity Detail Text: Black while editing, Vibrant Amber when saved.
 * - Description Modals: Fully disabled/Read-only when the step is locked.
 * 3. PROCESS FLOW INSPECTOR (STATE-OF-THE-ART BPMN UX):
 * - Background: Corporate White canvas for max contrast.
 * - Palette: Descending analogous harmony (Violet -> Indigo -> Blue -> Cyan -> Teal -> Emerald).
 * - BPMN Logic: Clear differentiation of User Tasks, Data Objects, Timers, and End Events.
 * - Tandem: Contingency modeled as an exception flow (dashed line downwards).
 * - Expansion: Zero-scroll, click-to-reveal descriptions natively integrated.
 * 4. SYSTEM INTEGRITY:
 * - Language: 100% English.
 * - UID Isolation: Hard generation on clone.
 * ============================================================================
 */

import React, { useState, useRef } from 'react';
import { 
  Settings, Users, Plus, ArrowRight, Save, Search, CheckCircle2, 
  Clock, Zap, Shield, Layers, Target, GripVertical, X,
  Edit2, FileText, ChevronUp, ChevronDown, Copy, AlertTriangle, GitBranch,
  Eye, User, Info, ArrowDown, MoveRight
} from 'lucide-react';

// --- INJECTED STYLES FOR UI PROTECTION ---
const injectedStyles = `
  .text-\\[4px\\] { font-size: 4px !important; line-height: 1 !important; }
  .text-\\[5px\\] { font-size: 5px !important; line-height: 1 !important; }
  .text-\\[6px\\] { font-size: 6px !important; line-height: 1 !important; }
  .text-\\[7px\\] { font-size: 7px !important; line-height: 1 !important; }
  .text-\\[8px\\] { font-size: 8px !important; line-height: 1 !important; }
  .text-\\[9px\\] { font-size: 9px !important; line-height: 1 !important; }
  .text-\\[10px\\] { font-size: 10px !important; line-height: 1.2 !important; }
  .font-black { font-weight: 900 !important; }
  .tracking-widest { letter-spacing: 0.1em !important; }
  .bg-slate-50\\/20 { background-color: rgba(248, 250, 252, 0.2) !important; }
  .bg-slate-50\\/40 { background-color: rgba(248, 250, 252, 0.4) !important; }
  .backdrop-blur-md { backdrop-filter: blur(12px) !important; }
  .backdrop-blur-sm { backdrop-filter: blur(4px) !important; }
  .grid-cols-5 { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

const generateUID = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const App = () => {
  const [activeTab, setActiveTab] = useState('editor');
  const [playbookName, setPlaybookName] = useState('B2B REALTOR OUTREACH STRATEGY');
  const [isEditingName, setIsEditingName] = useState(false);
  const [playbookType, setPlaybookType] = useState('GROWTH'); 
  const [playbookFamily, setPlaybookFamily] = useState('COMMERCIAL');
  const [playbookStrategy, setPlaybookStrategy] = useState('B2B');
  const [playbookPurpose, setPlaybookPurpose] = useState('Align sales pitch with the commercial strategy.');
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [status, setStatus] = useState('DRAFT');
  const [repeatableActivities, setRepeatableActivities] = useState([]);
  const [warningModal, setWarningModal] = useState({ open: false, type: '', data: null, message: '', title: '' });
  const [replaceModal, setReplaceModal] = useState({ open: false, targetId: null, sourceData: null });
  const [descModal, setDescModal] = useState({ open: false, stepId: null, field: '', title: '', value: '', isLocked: false });
  
  const [flowInspectorStep, setFlowInspectorStep] = useState(null);

  const dragItemIdx = useRef(null);
  const dragOverItemIdx = useRef(null);

  const internalRoles = ['Business Developer', 'Sales Manager', 'Training Mgr', 'Compliance Officer'];
  const externalRoles = ['Realtor', 'Broker', 'Lender', 'Client'];
  const frequencyOptions = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  const activityLibrary = [
    { type: 'CALL', options: ['Cold call to new realtor', 'Follow-up previous meeting', 'Mortgage quote follow-up'] },
    { type: 'EMAIL', options: ['Initial intro campaign', 'Optimized follow-up', 'Quote delivery email'] }
  ];
  const employeeList = [
    { id: '1', name: 'Carlos Rodriguez', role: 'Training Mgr' },
    { id: '2', name: 'Ana Martinez', role: 'Operations Lead' }
  ];

  const [activePB, setActivePB] = useState({
    globalOwners: ['Business Developer'], 
    steps: [
      {
        id: 1,
        uid: 'HBT032',
        stepNum: '01',
        name: 'COLD CALL TO NEW REALTOR',
        typeOfActivity: 'CALL',
        purpose: 'Align sales pitch with the commercial strategy.',
        activityDescription: 'Professional pitch following HOMESI standards for cold reaching.',
        deliverable: 'RETENTION QUIZ',
        deliverableDescription: 'A 5-question form to validate information retention.',
        stakeholder: 'SALES MANAGER',
        frequency: 'DAILY',
        repetitions: 8,
        freqNotes: 'Execution window between 9:00 AM and 11:00 AM EST.',
        schedulerValue: 0,
        supportingTask: 'MICRO-VIDEO PRODUCTION',
        counteractionDescription: 'If calls fail to convert, produce a micro-video summary.',
        requestedTo: '1', 
        sla: 'MIN 5 CALLS',
        slaDescription: 'Minimum of 5 documented calls per total proposed per session.',
        isLocked: true,
        isRepeatable: false
      }
    ]
  });

  // --- HANDLERS ---
  const handleStepUpdate = (stepId, field, value) => {
    setActivePB(prev => ({ 
      ...prev, 
      steps: prev.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s) 
    }));
  };

  const handleReorderSteps = () => {
    if (dragItemIdx.current !== null && dragOverItemIdx.current !== null && dragItemIdx.current !== dragOverItemIdx.current) {
      const newList = [...activePB.steps];
      const draggedItem = newList.splice(dragItemIdx.current, 1)[0];
      newList.splice(dragOverItemIdx.current, 0, draggedItem);
      const sequencedList = newList.map((step, index) => ({
        ...step,
        stepNum: String(index + 1).padStart(2, '0')
      }));
      setActivePB(prev => ({ ...prev, steps: sequencedList }));
    }
    dragItemIdx.current = null;
    dragOverItemIdx.current = null;
  };

  const handleDropGlobalOwner = (role) => {
    if (!activePB.globalOwners.includes(role)) {
      setActivePB(prev => ({ ...prev, globalOwners: [...prev.globalOwners, role] }));
    }
  };

  const handleRemoveGlobalOwner = (role) => {
    setActivePB(prev => ({ ...prev, globalOwners: prev.globalOwners.filter(r => r !== role) }));
  };

  const handleLockToggle = (stepId) => {
    const step = activePB.steps.find(s => s.id === stepId);
    if (!step) return;
    if (step.isLocked && step.isRepeatable) {
      setWarningModal({ 
        open: true, type: 'edit_warning', data: step, title: "Edit Warning", 
        message: "Local changes will not be synchronized with the library source." 
      });
    } else {
      handleStepUpdate(stepId, 'isLocked', !step.isLocked);
    }
  };

  const toggleRepeatable = (step) => {
    if (!step.isRepeatable) {
        if (!step.isLocked) {
            setWarningModal({ open: true, type: 'alert', title: "Action Required", message: "Save first before promoting to library." });
            return;
        }
        handleStepUpdate(step.id, 'isRepeatable', true);
        setRepeatableActivities(prev => [...prev, { ...JSON.parse(JSON.stringify(step)), isRepeatable: true }]);
    } else {
        setWarningModal({ open: true, type: 'uncheck', data: step, title: "Integrity Warning", message: "This activity will be removed from library." });
    }
  };

  const confirmUncheck = (step) => {
    handleStepUpdate(step.id, 'isRepeatable', false);
    setRepeatableActivities(prev => prev.filter(a => a.uid !== step.uid));
    setWarningModal({ open: false, type: '', data: null, message: '', title: '' });
  };

  const handleReplaceConfirm = () => {
    if (replaceModal.targetId === null || !replaceModal.sourceData) return;
    const { targetId, sourceData } = replaceModal;
    setActivePB(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === targetId ? { 
        ...JSON.parse(JSON.stringify(sourceData)), 
        id: targetId, uid: generateUID(), stepNum: s.stepNum, 
        schedulerValue: s.schedulerValue, isRepeatable: false, isLocked: true 
      } : s)
    }));
    setReplaceModal({ open: false, targetId: null, sourceData: null });
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden w-full relative">
      <style dangerouslySetInnerHTML={{ __html: injectedStyles }} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 z-20 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 pr-6 border-r border-slate-100 h-12 shrink-0 text-slate-900">
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Zap size={16} fill="currentColor" /></div>
              <span className="font-black text-sm uppercase tracking-tighter">Playbook Designer</span>
            </div>
            
            <div className="flex-1 max-w-xl mx-6 border border-slate-200 rounded-xl p-2.5 bg-slate-50/40 shadow-inner grid grid-cols-2 gap-x-6 gap-y-1.5">
              <MetadataField label="TYPE" value={playbookType} onChange={setPlaybookType} options={['CORE', 'GROWTH', 'ELITE']} />
              <MetadataField label="STRATEGY" value={playbookStrategy} onChange={setPlaybookStrategy} options={['B2B', 'B2C', 'NPPM']} />
              <MetadataField label="FAMILY" value={playbookFamily} onChange={setPlaybookFamily} options={['COMMERCIAL', 'OPERATIONAL']} />
              <div className="flex items-center justify-between gap-2">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">MISSION:</label>
                <button onClick={() => setShowPurposeModal(true)} className="flex items-center gap-1 px-3 text-[7px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 bg-white rounded uppercase h-5 justify-center transition-all shadow-sm"><FileText size={8} /> PURPOSE</button>
              </div>
            </div>

            <div className="flex items-center gap-6 pl-6 border-l border-slate-100 shrink-0 h-12 text-slate-900">
              <div className="flex flex-col text-right">
                <label className="text-[6px] font-black text-slate-300 uppercase tracking-tighter">DESIGNER</label>
                <p className="text-[8px] font-bold text-slate-500 uppercase">ARCHITECT ANTIGRAVITY (EID-001)</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[8px] font-black border uppercase ${status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{status}</div>
              <Settings size={14} className="text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 pt-2 relative text-slate-800">
            <div className="flex items-center gap-2 flex-1 group text-slate-900">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NAME:</label>
              {isEditingName ? (
                <input value={playbookName} onChange={e => setPlaybookName(e.target.value.toUpperCase())} onBlur={() => setIsEditingName(false)} className="text-sm font-black uppercase outline-none bg-transparent border-b border-indigo-500 flex-1 py-1" autoFocus />
              ) : (
                <h1 className="text-sm font-black uppercase truncate flex-1 leading-none">{playbookName}</h1>
              )}
              <button onClick={() => setIsEditingName(!isEditingName)} className="p-1 text-slate-300 hover:text-indigo-600 transition-all"><Edit2 size={12} /></button>
            </div>
            <div className="flex gap-2 ml-8 shrink-0">
              <button className="px-4 py-1.5 bg-white border border-slate-200 rounded font-black text-[9px] text-slate-400 uppercase hover:bg-slate-50 transition-colors shadow-sm">DRAFT</button>
              <button onClick={() => setStatus('SUBMITTED')} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded font-black text-[10px] shadow-md uppercase hover:bg-indigo-700 active:scale-95 transition-all"><Save size={14} /> SAVE & PUBLISH</button>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-slate-100 px-8 flex gap-10 shrink-0 z-10">
          {['RECIPE EDITOR', 'VISUAL MAP'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0])} className={`py-4 px-1 flex items-center gap-2 text-[9px] font-black transition-all relative uppercase tracking-[0.15em] ${activeTab === tab.toLowerCase().split(' ')[0] ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}>
              {tab === 'RECIPE EDITOR' ? <Layers size={14} /> : <GitBranch size={14} />} {tab}
              {activeTab === tab.toLowerCase().split(' ')[0] && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.3)]"></div>}
            </button>
          ))}
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 overflow-auto p-5 relative bg-slate-50/20 custom-scrollbar">
          {activeTab === 'editor' && (
            <EditorArea 
              playbook={activePB}
              onUpdate={handleStepUpdate} 
              onLock={handleLockToggle} 
              onRepeat={toggleRepeatable} 
              onReplace={(t, s) => setReplaceModal({ open: true, targetId: t, sourceData: s })}
              onAddOwner={handleDropGlobalOwner}
              onRemoveOwner={handleRemoveGlobalOwner}
              onOpenDesc={(step, field, title) => setDescModal({ open: true, stepId: step.id, field, title, value: step[field] || '', isLocked: step.isLocked })}
              onOpenFlow={(step) => setFlowInspectorStep(step)}
              dragItemIdx={dragItemIdx}
              dragOverItemIdx={dragOverItemIdx}
              handleReorderSteps={handleReorderSteps}
              freqOptions={frequencyOptions} 
              empList={employeeList} 
              lib={activityLibrary} 
              onAdd={() => setActivePB(p => ({ 
                ...p, 
                steps: [...p.steps, { 
                  id: Date.now(), uid: generateUID(), stepNum: String(p.steps.length + 1).padStart(2, '0'), 
                  name: 'NEW ACTIVITY', stakeholder: 'DROP', frequency: 'DAILY', 
                  repetitions: 1, freqNotes: '', deliverableDescription: '', schedulerValue: 0, isLocked: false, isRepeatable: false,
                  deliverable: '', activityDescription: '', supportingTask: '', counteractionDescription: '', requestedTo: '', sla: 'SLA', slaDescription: ''
                }] 
              }))} 
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

      {/* LIBRARY ASSETS */}
      <aside className="w-[340px] bg-white border-l border-slate-200 hidden lg:flex flex-col shadow-2xl shrink-0 z-30">
        <div className="p-6 border-b border-slate-100 text-center text-slate-800">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] mb-4">LIBRARY ASSETS</h2>
          <div className="relative text-slate-800">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" placeholder="Filter library..." />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-10 custom-scrollbar text-slate-800">
          <RoleGroup title="INTERNAL ROLES" roles={internalRoles} color="indigo" />
          <RoleGroup title="EXTERNAL ROLES" roles={externalRoles} color="emerald" />
          
          <div>
            <h3 className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">ACTIVITY TYPES</h3>
            {activityLibrary.map(l => (
              <div key={l.type} draggable onDragStart={e => e.dataTransfer.setData("activityType", l.type)} className="p-3.5 rounded-xl border border-slate-100 bg-white mb-3 shadow-sm hover:border-indigo-400 cursor-grab flex justify-between items-center transition-all group active:cursor-grabbing">
                <div className="flex items-center gap-3 text-slate-800">
                  <Layers size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{l.type}</span>
                </div>
                <GripVertical size={14} className="text-slate-200 group-hover:text-indigo-400" />
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2"><Shield size={12} className="text-indigo-500" /> REPEATABLE NODES</h3>
            {repeatableActivities.length === 0 ? (
              <p className="text-[9px] text-slate-300 italic text-center p-8 border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/30 uppercase tracking-widest">No nodes saved</p>
            ) : (
              repeatableActivities.map((act, i) => (
                <div key={i} draggable onDragStart={e => e.dataTransfer.setData("repeatableActivity", JSON.stringify(act))} className="p-4 rounded-2xl border-2 border-indigo-50 bg-white hover:border-indigo-400 transition-all cursor-grab shadow-sm mb-3 group active:cursor-grabbing hover:shadow-md text-slate-800 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-tighter">UID: {act.uid}</span>
                    <Shield size={12} className="text-indigo-500" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase truncate text-slate-700 mb-2">{act.name}</h4>
                  <GripVertical size={12} className="text-slate-100 group-hover:text-slate-300 ml-auto" />
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* OVERLAYS */}
      {warningModal.open && <WarningModal data={warningModal} onClose={() => setWarningModal({ ...warningModal, open: false })} onConfirm={() => confirmUncheck(warningModal.data)} />}
      
      {replaceModal.open && <SystemModal title="CONFIRM REPLACEMENT" message="Isolation UID will be generated." type="confirm" onClose={() => setReplaceModal({ open: false, targetId: null, sourceData: null })} onConfirm={handleReplaceConfirm} />}

      {(descModal.open || showPurposeModal) && (
        <DescriptionModal 
          title={showPurposeModal ? "MISSION PURPOSE" : descModal.title} 
          value={showPurposeModal ? playbookPurpose : descModal.value}
          isReadOnly={showPurposeModal ? false : descModal.isLocked} 
          onSave={(v) => { 
            if (showPurposeModal) { setPlaybookPurpose(v); setShowPurposeModal(false); } 
            else { handleStepUpdate(descModal.stepId, descModal.field, v); setDescModal({ ...descModal, open: false }); }
          }} 
          onClose={() => showPurposeModal ? setShowPurposeModal(false) : setDescModal({ ...descModal, open: false })} 
        />
      )}

      {/* FLOW INSPECTOR OVERLAY (WHITE CORPORATE & BPMN THEME) */}
      {flowInspectorStep && (
        <FlowInspectorBPMN 
          step={flowInspectorStep} 
          owners={activePB.globalOwners}
          employeeList={employeeList}
          playbookPurpose={playbookPurpose}
          onClose={() => setFlowInspectorStep(null)} 
        />
      )}
    </div>
  );
};

// ============================================================================
// CORE EDITOR COMPONENTS
// ============================================================================

const MetadataField = ({ label, value, onChange, options }) => (
  <div className="flex items-center justify-between gap-2">
    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{label}:</label>
    <select value={value} onChange={e => onChange(e.target.value)} className="text-[8px] font-black text-indigo-700 uppercase bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none w-24 h-5 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const EditorArea = ({ playbook, onUpdate, onLock, onRepeat, onReplace, onAddOwner, onRemoveOwner, onOpenDesc, onOpenFlow, dragItemIdx, dragOverItemIdx, handleReorderSteps, freqOptions, empList, lib, onAdd }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {playbook.steps.map((step, idx) => (
        <div 
          key={step.id} 
          draggable={!step.isLocked}
          onDragStart={() => { dragItemIdx.current = idx; }}
          onDragEnter={() => { dragOverItemIdx.current = idx; }}
          onDragEnd={handleReorderSteps}
          onDragOver={(e) => e.preventDefault()}
          className={`bg-white rounded-xl border border-slate-100 shadow-md flex flex-col md:flex-row relative group overflow-hidden transition-all hover:shadow-lg ${!step.isLocked ? 'cursor-move' : ''}`}
        >
          {/* CONTROL COLUMN (LEFT) */}
          <div onDrop={e => { e.preventDefault(); if(!step.isLocked) { const data = e.dataTransfer.getData("repeatableActivity"); if(data) onReplace(step.id, JSON.parse(data)); } }} onDragOver={e => e.preventDefault()} className="flex-1 p-4 border-r border-slate-50 relative group-hover:bg-slate-50/10 transition-colors">
            <div className="absolute top-4 left-2 flex flex-col items-center w-12 gap-1.5">
              <GripVertical size={14} className={`text-slate-100 transition-colors ${!step.isLocked && 'group-hover:text-indigo-400'}`} />
              <div className="w-6 h-6 rounded bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-md">{step.stepNum}</div>
              <div className="mt-1 border-t border-slate-100 w-full pt-1 flex flex-col items-center gap-2">
                <span className="text-[5px] font-black text-slate-300 uppercase tracking-tighter text-slate-400">UID: {step.uid}</span>
                <div onClick={() => onRepeat(step)} className="flex flex-col items-center cursor-pointer group/repeat">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${step.isRepeatable ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-300 group-hover/repeat:border-indigo-500'}`}>
                    {step.isRepeatable && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className={`text-[4px] font-black uppercase text-center leading-tight mt-1 ${step.isRepeatable ? 'text-indigo-600' : 'text-slate-400'}`}>REPEATABLE</span>
                </div>
                <button onClick={() => onLock(step.id)} className={`p-1.5 rounded shadow-sm transition-all ${step.isLocked ? 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600' : 'bg-indigo-50 border border-indigo-200 text-indigo-600 animate-pulse'}`}>
                   {step.isLocked ? <Edit2 size={10} /> : <Save size={10} />}
                </button>
                <span className="text-[4px] font-black text-slate-300 uppercase tracking-widest leading-none mt-1">{step.isLocked ? 'EDIT' : 'SAVE'}</span>
              </div>
            </div>

            <div className="pl-14">
              <div className="flex items-center gap-6 mb-4 text-slate-900">
                {/* ACTIVITY TYPE ZONE */}
                <div 
                  onDrop={e => { e.preventDefault(); if(!step.isLocked) { const type = e.dataTransfer.getData("activityType"); if(type) onUpdate(step.id, 'typeOfActivity', type); } }} 
                  onDragOver={e => e.preventDefault()}
                  className={`w-20 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${step.typeOfActivity ? (step.isLocked ? 'bg-slate-400 border-slate-400' : 'bg-slate-900 border-slate-900') : 'bg-slate-50 border-slate-200 text-slate-300 border-dashed'} text-white shadow-lg`}
                >
                   {step.typeOfActivity ? <span className="text-[10px] font-black uppercase">{step.typeOfActivity}</span> : <span className="text-[6px] font-black text-slate-300 italic uppercase text-center leading-tight">DRAG<br/>TYPE</span>}
                </div>
                
                <div className="flex-1 flex flex-col justify-start">
                  <label className="text-[7px] font-black text-slate-300 uppercase block mb-1 tracking-widest text-left leading-none">ACTIVITY DETAIL</label>
                  <div className="flex flex-col">
                    <select 
                      value={step.name} 
                      disabled={step.isLocked} 
                      onChange={e => onUpdate(step.id, 'name', e.target.value)} 
                      className={`w-full text-sm font-black uppercase outline-none bg-transparent border-b-2 border-slate-50 focus:border-indigo-400 truncate transition-colors ${step.isLocked ? 'text-amber-600 font-bold' : 'text-slate-800'}`}
                    >
                      <option disabled value="">SELECT ACTIVITY</option>
                      {lib.find(l => l.type === step.typeOfActivity)?.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button onClick={() => onOpenDesc(step, 'activityDescription', 'DESCRIBE THE ACTIVITY')} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-1.5 h-[10px]">
                      <FileText size={10} />
                      <span className="text-[6px] font-black uppercase tracking-tighter">DESCRIBE THE ACTIVITY</span>
                    </button>
                  </div>
                </div>
                
                {/* TIMELINE CONTROLLER */}
                <div className="flex flex-col items-end gap-1 pl-4 border-l border-slate-50 shrink-0">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">TIMELINE</label>
                  <div className={`flex items-center gap-1 p-1 border rounded-lg transition-all ${step.isLocked ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50/30 border-indigo-100 shadow-inner'}`}>
                    <div className="flex flex-col">
                      <button disabled={idx === 0 || step.isLocked} onClick={() => onUpdate(step.id, 'schedulerValue', step.schedulerValue + 1)} className="p-0.5 hover:text-indigo-600 disabled:opacity-0 text-slate-400"><ChevronUp size={10} /></button>
                      <button disabled={idx === 0 || step.isLocked || step.schedulerValue <= 0} onClick={() => onUpdate(step.id, 'schedulerValue', Math.max(0, step.schedulerValue - 1))} className="p-0.5 hover:text-indigo-600 disabled:opacity-0 text-slate-400"><ChevronDown size={10} /></button>
                    </div>
                    <div className="flex items-center gap-1 px-1">
                        {idx !== 0 && <span className="text-[10px] font-black text-indigo-400">+</span>}
                        <input type="number" value={step.schedulerValue} disabled={idx === 0 || step.isLocked} onChange={e => onUpdate(step.id, 'schedulerValue', parseInt(e.target.value) || 0)} className="w-8 bg-transparent text-[11px] font-black text-indigo-700 outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:cursor-not-allowed" />
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">DAYS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ALIGNED ATTRIBUTE GRID */}
              <div className="grid grid-cols-5 gap-4 pt-4 border-t border-slate-100 text-slate-800">
                <div className="flex flex-col h-[80px]">
                  <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0"><Users size={10} /> RESPONSIBLES</label>
                  <div className="mt-2 flex-1">
                     <DropArea value={playbook.globalOwners} isMultiple={true} disabled={step.isLocked} onDrop={onAddOwner} onRemove={onRemoveOwner} hideLabel={true} />
                  </div>
                </div>
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0"><CheckCircle2 size={10} /> DELIVERABLE</label>
                  <div className="mt-2 flex-1">
                    <input value={step.deliverable} disabled={step.isLocked} onChange={e => onUpdate(step.id, 'deliverable', e.target.value.toUpperCase())} className="w-full text-[9px] font-black uppercase outline-none bg-transparent placeholder-slate-200" placeholder="TASK GOAL" />
                  </div>
                  <button onClick={() => onOpenDesc(step, 'deliverableDescription', 'DESCRIBE DELIVERY')} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]">
                    <FileText size={10} />
                    <span className="text-[6px] font-black uppercase tracking-tighter">DESCRIBE DELIVERY</span>
                  </button>
                </div>
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0"><ArrowRight size={10} /> STAKEHOLDER</label>
                  <div className="mt-2 flex-1">
                    <DropArea value={step.stakeholder} isMultiple={false} disabled={step.isLocked} onDrop={val => onUpdate(step.id, 'stakeholder', val)} hideLabel={true} />
                  </div>
                </div>
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4">
                  <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0"><Clock size={10} /> FREQ</label>
                  <div className="mt-2 flex-1 flex flex-col gap-1">
                    <select value={step.frequency} disabled={step.isLocked} onChange={e => onUpdate(step.id, 'frequency', e.target.value)} className="text-[9px] font-black uppercase outline-none bg-transparent w-full cursor-pointer border-b border-slate-100 pb-0.5">
                      {freqOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <div className="flex items-center justify-between gap-1 bg-slate-50 p-1 rounded">
                      <label className="text-[5px] font-black text-slate-400 uppercase">REPS:</label>
                      <input type="number" min="1" value={step.repetitions || 1} disabled={step.isLocked} onChange={e => onUpdate(step.id, 'repetitions', parseInt(e.target.value) || 1)} className="w-6 bg-transparent text-[8px] font-black text-indigo-700 outline-none text-center" />
                    </div>
                  </div>
                  <button onClick={() => onOpenDesc(step, 'freqNotes', 'DESCRIBE FREQUENCY & REPS')} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]">
                    <FileText size={10} />
                    <span className="text-[6px] font-black uppercase tracking-tighter">DESCRIBE FREQ & REPS</span>
                  </button>
                </div>
                <div className="flex flex-col h-[80px] border-l border-slate-100 pl-4 text-slate-900">
                  <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 h-[10px] leading-none shrink-0"><Target size={10} /> SLA</label>
                  <div className="mt-2 flex-1">
                    <button type="button" className="text-left w-full hover:bg-slate-50 rounded transition-all active:scale-95 group/sla">
                      <p className="text-[9px] font-black text-slate-800 uppercase truncate">{step.sla || 'SLA'}</p>
                    </button>
                  </div>
                  <button onClick={() => onOpenDesc(step, 'slaDescription', 'DESCRIBE SLA')} className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors mt-auto shrink-0 h-[10px]">
                    <FileText size={10} />
                    <span className="text-[6px] font-black uppercase tracking-tighter">DESCRIBE SLA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COUNTERACTION */}
          <div className="w-full md:w-72 bg-slate-50/20 p-4 flex flex-col border-t md:border-t-0 md:border-l border-slate-50 relative transition-all group-hover:bg-slate-50/40 text-left text-slate-900">
            <button onClick={() => step.isLocked && onOpenFlow(step)} className={`absolute top-4 right-4 p-1 rounded-full transition-all ${step.isLocked ? 'text-indigo-600 hover:bg-indigo-100 cursor-pointer scale-110' : 'text-slate-200 cursor-not-allowed'}`}><Eye size={18} /></button>
            <span className="text-[8px] font-black text-indigo-600 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg" /> COUNTERACTION</span>
            <div className="space-y-4">
              <div>
                <label className="text-[6px] font-black text-slate-400 uppercase mb-1 tracking-widest block">SUPPORT TASK:</label>
                <input value={step.supportingTask} disabled={step.isLocked} onChange={e => onUpdate(step.id, 'supportingTask', e.target.value.toUpperCase())} className="text-[9px] font-black uppercase bg-white border border-slate-100 rounded-lg px-2 py-2 outline-none w-full shadow-sm focus:border-indigo-300 transition-all placeholder-slate-200 text-slate-900" placeholder="SUPPORT NAME" />
              </div>
              <div>
                <label className="text-[6px] font-black text-slate-400 uppercase mb-1 tracking-widest block">ASSIGN TO:</label>
                <select value={step.requestedTo} disabled={step.isLocked} onChange={e => onUpdate(step.id, 'requestedTo', e.target.value)} className="text-[9px] font-bold bg-white border border-slate-100 rounded-lg outline-none h-9 w-full shadow-sm px-2 cursor-pointer focus:border-indigo-300 transition-all text-slate-900">
                  <option value="">Select Employee</option>
                  {empList.map(e => <option key={e.id} value={e.id}>{e.name} - {e.role}</option>)}
                </select>
              </div>
              <button onClick={() => onOpenDesc(step, 'counteractionDescription', 'COUNTERACTION DESCRIPTION')} className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 text-[7px] font-black uppercase tracking-widest mt-1 transition-colors"><FileText size={10} /> Describe Request</button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-black text-[10px] uppercase hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/10 transition-all flex items-center justify-center gap-3 active:scale-[0.99] group">
        <Plus size={16} className="group-hover:rotate-90 transition-transform" /> ADD OPERATIONAL NODE
      </button>
    </div>
  );
};

const RoleGroup = ({ title, roles, color }) => (
  <div>
    <h3 className={`text-[8px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] flex items-center gap-2`}><Users size={12} className={color === 'indigo' ? 'text-indigo-500' : 'text-emerald-500'} /> {title}</h3>
    <div className="flex flex-wrap gap-2 text-slate-800">
      {roles.map(role => (
        <div key={role} draggable onDragStart={e => e.dataTransfer.setData("roleName", role)} className={`px-2.5 py-1.5 rounded-lg border text-[8px] font-black cursor-grab active:scale-95 shadow-sm transition-all ${color === 'indigo' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-400'}`}>
          {role}
        </div>
      ))}
    </div>
  </div>
);

const DropArea = ({ label, icon, value, isMultiple, disabled, onDrop, onRemove, hideLabel = false }) => {
  const [isOver, setIsOver] = useState(false);
  return (
    <div 
      onDragOver={e => { e.preventDefault(); if(!disabled) setIsOver(true); }} 
      onDragLeave={() => setIsOver(false)}
      onDrop={e => { e.preventDefault(); setIsOver(false); if(!disabled) onDrop(e.dataTransfer.getData("roleName")); }}
      className={`relative transition-all text-left text-slate-800 ${isOver ? 'bg-indigo-50/50 scale-105 shadow-md z-10 rounded-lg' : ''} ${disabled ? 'opacity-80' : ''}`}
    >
      {!hideLabel && <label className="text-[7px] text-slate-400 font-black uppercase flex items-center gap-1.5 mb-1 leading-none h-[10px]">{icon} {label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {isMultiple ? (
          value.map((role, i) => (
            <div key={i} className="bg-indigo-900 text-white px-2 py-1 rounded-lg text-[6px] font-black flex items-center gap-1.5 shadow-sm group/tag animate-in fade-in zoom-in duration-200">
              {role}
              {!disabled && <X size={8} className="cursor-pointer text-indigo-400 hover:text-white transition-colors" onClick={() => onRemove(role)} />}
            </div>
          ))
        ) : (
          value && value !== 'DROP' ? (
            <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[7px] font-black truncate shadow-sm uppercase w-full text-center animate-in fade-in duration-300 tracking-tighter">{value}</div>
          ) : <div className="text-[7px] text-slate-200 italic font-black uppercase text-center w-full border border-dashed border-slate-200 rounded-lg py-1">DROP</div>
        )}
      </div>
    </div>
  );
};

const SystemModal = ({ title, message, type, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80 animate-in fade-in duration-300 text-center text-slate-900">
    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border p-10 animate-in zoom-in duration-400">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 shadow-xl ${type === 'alert' ? 'bg-red-50 text-red-500 border-red-100' : type === 'confirm' ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-amber-50 text-amber-500 border-amber-100'}`}>
        {type === 'alert' ? <AlertTriangle size={40} /> : type === 'confirm' ? <Copy size={40} /> : <Shield size={40} />}
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight mb-3 leading-tight">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">"{message}"</p>
      <div className="mt-8 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-all">CANCEL</button>
        <button onClick={type === 'alert' ? onClose : onConfirm} className={`flex-1 py-3 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all ${type === 'uncheck' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {type === 'alert' ? 'UNDERSTOOD' : type === 'confirm' ? 'YES, REPLACE' : 'CONFIRM'}
        </button>
      </div>
    </div>
  </div>
);

const WarningModal = ({ data, onClose, onConfirm }) => (
  <SystemModal title={data.title} message={data.message} type={data.type} onClose={onClose} onConfirm={onConfirm} />
);

const DescriptionModal = ({ title, value, onSave, onClose, isReadOnly }) => {
  const [text, setText] = useState(value);
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200 text-slate-900">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-tighter">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-all"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="mb-2 flex justify-between">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Detail Specifications</span>
            <span className="text-[8px] font-black text-slate-400">{text.length}/1000</span>
          </div>
          <textarea 
            maxLength={1000} 
            value={text} 
            onChange={(e) => !isReadOnly && setText(e.target.value)} 
            readOnly={isReadOnly}
            className={`w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] outline-none ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'focus:border-indigo-500'} transition-all font-medium text-slate-600 italic resize-none leading-relaxed custom-scrollbar`} 
            placeholder={isReadOnly ? "No details provided." : "Enter details..."} 
          />
          <div className="mt-4 flex justify-end gap-2 text-[10px] font-black uppercase">
            {isReadOnly ? (
              <button onClick={onClose} className="px-8 py-2 bg-slate-200 text-slate-600 rounded-xl shadow-sm hover:bg-slate-300 active:scale-95 transition-all">CLOSE</button>
            ) : (
              <>
                <button onClick={onClose} className="px-5 py-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">DISCARD</button>
                <button onClick={() => onSave(text)} className="px-8 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-500/20">SAVE CHANGES</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FLOW INSPECTOR COMPONENT (BPMN WHITE EDITION - V20)
// ============================================================================

const FlowInspectorBPMN = ({ step, owners, employeeList, playbookPurpose, onClose }) => {
  const [activeNode, setActiveNode] = useState(null);
  const employee = employeeList.find(e => e.id === step.requestedTo);

  return (
    <div className="fixed inset-0 z-[1000] bg-white flex flex-col p-6 animate-in fade-in duration-300 overflow-hidden">
      {/* CORPORATE HEADER */}
      <header className="flex justify-between items-center mb-6 px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg"><GitBranch size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Process Trace Engine</h2>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Activity Step {step.stepNum}</span>
              <span className="text-[10px] text-slate-300">•</span>
              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">ID: {step.uid}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all active:scale-90"><X size={24} /></button>
      </header>

      {/* MAIN VISUAL CANVAS */}
      <div className="flex-1 flex flex-col justify-center items-center relative gap-8">
        
        {/* NARRATIVE BACKGROUND */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-50 font-black text-[25vw] pointer-events-none tracking-tighter uppercase whitespace-nowrap z-0">
           BPMN
        </div>

        {/* ROW 1: THE CORE SEQUENCE (DESCENDING ANALOGOUS HARMONY) */}
        <div className="flex items-start justify-center gap-2 relative z-10 w-full px-10">
          
          {/* VIOLET-600 -> USER TASK */}
          <SolidNode 
            label="EXECUTORS" 
            title={owners.join(' & ')} 
            bgClass="bg-violet-600" 
            icon={<User size={20} />} 
            desc={playbookPurpose}
            isActive={activeNode === 'actor'}
            onClick={() => setActiveNode(activeNode === 'actor' ? null : 'actor')}
          />

          <NodeConnector label={`Day ${step.schedulerValue}`} />

          {/* INDIGO-600 -> ACTIVITY TASK WITH TANDEM BRANCH */}
          <div className="relative">
            <SolidNode 
              label="ACTIVITY TASK" 
              title={step.name} 
              bgClass="bg-indigo-600" 
              icon={<Zap size={20} />} 
              desc={step.activityDescription}
              isActive={activeNode === 'action'}
              onClick={() => setActiveNode(activeNode === 'action' ? null : 'action')}
            />

            {/* VERTICAL BRANCH TO COUNTERACTION (EXCEPTION FLOW) */}
            <div className="absolute left-1/2 -bottom-[130px] -translate-x-1/2 flex flex-col items-center">
              <div className="h-12 w-0 border-r-2 border-dashed border-slate-300"></div>
              <div 
                className="bg-amber-500 p-4 rounded-2xl w-[260px] shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95" 
                onClick={() => setActiveNode(activeNode === 'counter' ? null : 'counter')}
              >
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white/20 text-white"><Shield size={16}/></div>
                    <div>
                      <label className="text-[8px] font-black text-white/70 uppercase tracking-widest block">CONTINGENCY TANDEM</label>
                      <h4 className="text-[11px] font-black text-white uppercase truncate">{step.supportingTask}</h4>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 px-2 py-1.5 bg-black/10 rounded-xl text-white">
                    <User size={12}/>
                    <span className="text-[9px] font-bold uppercase truncate">{employee ? employee.name : 'UNASSIGNED'}</span>
                 </div>
                 {activeNode === 'counter' && step.counteractionDescription && (
                    <div className="mt-3 p-3 bg-black/10 rounded-xl text-[10px] text-white font-medium italic leading-snug animate-in zoom-in duration-300 text-left">
                       "{step.counteractionDescription}"
                    </div>
                 )}
                 {step.counteractionDescription && activeNode !== 'counter' && <div className="mt-2 text-[6px] font-black text-white/60 uppercase tracking-widest text-center">Click to Expand</div>}
              </div>
            </div>
          </div>

          <NodeConnector label="Produces" />

          {/* BLUE-600 -> DATA OBJECT */}
          <SolidNode 
            label="DATA DELIVERABLE" 
            title={step.deliverable} 
            bgClass="bg-blue-600" 
            icon={<FileText size={20} />} 
            desc={step.deliverableDescription}
            isActive={activeNode === 'deliverable'}
            onClick={() => setActiveNode(activeNode === 'deliverable' ? null : 'deliverable')}
          />

          {/* MESSAGE FLOW TO EXTERNAL POOL */}
          <NodeConnector label="Message" dashed={true} />

          {/* CYAN-600 -> STAKEHOLDER */}
          <SolidNode 
            label="RECIPIENT" 
            title={step.stakeholder} 
            bgClass="bg-cyan-600" 
            icon={<Users size={20} />} 
          />

          <NodeConnector label="Execution" />

          {/* TEAL-600 -> TIMER EVENT */}
          <SolidNode 
            label="CADENCE TIMER" 
            title={`${step.repetitions}x ${step.frequency}`} 
            bgClass="bg-teal-600" 
            icon={<Clock size={20} />} 
            desc={step.freqNotes}
            isActive={activeNode === 'cadence'}
            onClick={() => setActiveNode(activeNode === 'cadence' ? null : 'cadence')}
          />

          <NodeConnector label="Metric" />

          {/* EMERALD-600 -> END EVENT (SLA) */}
          <SolidNode 
            label="SUCCESS SLA" 
            title={step.sla} 
            bgClass="bg-emerald-600" 
            icon={<Target size={20} />} 
            desc={step.slaDescription}
            isActive={activeNode === 'sla'}
            onClick={() => setActiveNode(activeNode === 'sla' ? null : 'sla')}
          />
        </div>

        {/* BOTTOM SPACER FOR TANDEM VIEWING */}
        <div className="h-[140px]"></div>

      </div>

      {/* FOOTER */}
      <footer className="flex justify-between items-center px-4 pt-4 border-t border-slate-100 text-slate-400">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.4em]">BPMN 2.0 Narrative Protocol</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest tracking-[0.2em] text-slate-300">HOMESI WORLD CLASS ARCHITECTURE</p>
      </footer>
    </div>
  );
};

const SolidNode = ({ label, title, bgClass, icon, desc, isActive, onClick }) => (
  <div className="flex flex-col items-center gap-2 group transition-all duration-300">
    <div 
      onClick={desc ? onClick : null}
      className={`p-5 rounded-[2rem] w-[180px] shadow-xl flex flex-col items-center text-center transition-all duration-300 ${bgClass} ${desc ? 'cursor-pointer hover:scale-105 active:scale-95 hover:shadow-2xl' : ''} animate-in zoom-in duration-500 text-white`}
    >
       <div className="mb-3 p-2 bg-white/20 rounded-xl text-white shadow-inner">{icon}</div>
       <label className="text-[7px] font-black text-white/70 uppercase tracking-[0.15em] mb-1">{label}</label>
       <h4 className="text-[11px] font-black text-white uppercase leading-tight min-h-[28px] flex items-center justify-center">{title}</h4>
       
       {isActive && desc && (
         <div className="mt-4 p-4 bg-black/10 rounded-2xl border border-white/10 animate-in slide-in-from-top-2 duration-300 w-full overflow-hidden shadow-inner text-left">
            <p className="text-[9px] text-white/90 italic font-medium leading-relaxed">"{desc}"</p>
         </div>
       )}
       
       {desc && !isActive && <div className="mt-2 text-[6px] font-black text-white/60 uppercase tracking-widest bg-black/10 px-2 py-1 rounded-full">Click to Expand</div>}
    </div>
  </div>
);

const NodeConnector = ({ label, dashed = false }) => (
  <div className="flex flex-col items-center justify-center pt-8 w-20 shrink-0">
    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
    <div className="flex items-center w-full">
      <div className={`h-0.5 flex-1 ${dashed ? 'border-t-2 border-dashed border-slate-300' : 'bg-slate-300'}`}></div>
      <MoveRight size={16} className="text-slate-400" />
      <div className={`h-0.5 flex-1 ${dashed ? 'border-t-2 border-dashed border-slate-300' : 'bg-slate-300'}`}></div>
    </div>
  </div>
);

export default App;