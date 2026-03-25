"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Clock, 
  User, 
  Calendar, 
  AlertCircle, 
  History,
  FileText,
  MessageSquare,
  CheckCircle2,
  Video,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PmoTask } from "@/types/pmo.types";
import { VibeTokens } from "@/packages/ui-kit/src/tokens";
import CrmSidebarSection from "@/components/pmo/integrations/CrmSidebarSection";

/**
 * SidePeek — High-Fidelity Task Detail Panel
 * Prompt #15 (Sprint 3) literal implementation.
 */

interface SidePeekProps {
  task: PmoTask;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<PmoTask>) => Promise<void>;
}

export const SidePeek: React.FC<SidePeekProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = React.useState<'details' | 'history'>('details');
  const [joinUrl, setJoinUrl] = useState<string | null>((task as any).joinUrl || null);

  // Listen for real-time Zoom URL from BullMQ via Supabase Realtime or socket
  useEffect(() => {
    const handleZoomReady = (event: CustomEvent) => {
      if (event.detail?.pmoEventId === task.id) {
        setJoinUrl(event.detail.joinUrl);
      }
    };
    window.addEventListener('event:zoom_url_ready', handleZoomReady as EventListener);
    return () => window.removeEventListener('event:zoom_url_ready', handleZoomReady as EventListener);
  }, [task.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-[var(--elevation-4)] z-[60] flex flex-col animate-slide-in-right border-l border-[var(--vibe-border)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--vibe-border)] bg-[var(--vibe-surface-2)]">
        <div className="flex items-center gap-2">
          {task.isProtected ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(0,134,192,0.1)] border border-[rgba(0,134,192,0.2)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--vibe-blue)]" />
              <span className="text-[10px] font-bold text-[var(--vibe-blue)] uppercase">Playbook Task</span>
            </div>
          ) : (
            <div className="text-[var(--vibe-text-muted)] text-[12px] font-medium">Standard Task</div>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-[rgba(0,0,0,0.05)] rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-[var(--vibe-text-muted)]" />
        </button>
      </div>

      {/* Main Info */}
      <div className="p-6 flex flex-col gap-6 overflow-y-auto scrollbar-thin">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <input 
            className="text-[20px] font-bold text-[var(--vibe-text-prime)] bg-transparent border-none focus:ring-0 w-full px-0"
            defaultValue={task.title}
            onBlur={(e) => onUpdate({ title: e.target.value })}
            placeholder="Task name..."
          />
          {task.sourcePlaybookId && (
            <div className="flex items-center gap-1.5 text-[var(--vibe-orange)] text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Protected by Simo IS: Cannot be deleted.</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--vibe-border)]">
          <button 
            onClick={() => setActiveTab('details')}
            className={cn(
              "px-4 py-2 text-[13px] font-semibold transition-all border-b-2",
              activeTab === 'details' ? "border-[var(--vibe-purple)] text-[var(--vibe-purple)]" : "border-transparent text-[var(--vibe-text-muted)] hover:text-[var(--vibe-text-prime)]"
            )}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 text-[13px] font-semibold transition-all border-b-2",
              activeTab === 'history' ? "border-[var(--vibe-purple)] text-[var(--vibe-purple)]" : "border-transparent text-[var(--vibe-text-muted)] hover:text-[var(--vibe-text-prime)]"
            )}
          >
            History
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--vibe-text-muted)]">
                  <User className="w-4 h-4" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">Assignee</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--vibe-surface-2)] rounded-[var(--radius-sm)] border border-[var(--vibe-border)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--vibe-purple)] flex items-center justify-center text-[10px] text-white font-bold">
                    {task.assigneeId?.substring(0, 2).toUpperCase() || "?"}
                  </div>
                  <span className="text-[13px] font-medium text-[var(--vibe-text-prime)]">{task.assigneeId || "Not assigned"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--vibe-text-muted)]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">Due Date</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--vibe-surface-2)] rounded-[var(--radius-sm)] border border-[var(--vibe-border)]">
                  <span className="text-[13px] font-medium text-[var(--vibe-text-prime)]">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[var(--vibe-text-muted)]">
                  <Clock className="w-4 h-4" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">SLA Status</span>
                </div>
                <div className={cn(
                  "flex items-center px-3 py-1.5 rounded-[var(--radius-sm)] font-bold text-[11px] uppercase border",
                  task.status === "done" 
                    ? "bg-[rgba(0,202,114,0.1)] text-[var(--vibe-green)] border-[rgba(0,202,114,0.2)]"
                    : "bg-[rgba(253,171,61,0.1)] text-[var(--vibe-orange)] border-[rgba(253,171,61,0.2)]"
                )}>
                  {task.status === "done" ? "SLA Met" : "On Time"}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[var(--vibe-text-muted)]">
                <FileText className="w-4 h-4" />
                <span className="text-[12px] font-bold uppercase tracking-wider">Description</span>
              </div>
              <textarea 
                className="w-full h-40 p-4 bg-[var(--vibe-surface-2)] rounded-[var(--radius-md)] border border-[var(--vibe-border)] text-[14px] text-[var(--vibe-text-prime)] focus:ring-[var(--vibe-purple)] focus:border-[var(--vibe-purple)]"
                defaultValue={task.description || ""}
                onBlur={(e) => onUpdate({ description: e.target.value })}
                placeholder="Add a technical description..."
              />
            </div>

            {/* Zoom Section — for events with type=ZOOM */}
            {(task as any).eventType === 'ZOOM' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[var(--vibe-text-muted)]">
                  <Video className="w-4 h-4" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">Zoom Meeting</span>
                </div>
                {joinUrl ? (
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      backgroundColor: '#2D8CFF',
                      color: '#fff',
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      width: 'fit-content',
                      transition: 'opacity 100ms ease-in-out',
                    }}
                  >
                    <Video className="w-4 h-4" /> Join Zoom Meeting
                  </a>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      backgroundColor: 'var(--vibe-surface-2, #F5F6F8)',
                      borderRadius: 4,
                      color: 'var(--vibe-text-muted, #676879)',
                      fontSize: 13,
                    }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Obtaining Zoom link...
                  </div>
                )}
              </div>
            )}

            {/* CRM Sidebar — Salesforce integration */}
            <CrmSidebarSection
              taskId={task.id}
              sfExternalId={(task as any).sfExternalId || null}
              sfExternalUrl={(task as any).sfExternalUrl || null}
              sfObjectName={(task as any).sfObjectName || null}
              onLink={async (sfObjectId, sfObjectType) => {
                await onUpdate({ ...task, sfExternalId: sfObjectId } as any);
              }}
              onUnlink={async () => {
                await onUpdate({ ...task, sfExternalId: null } as any);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Simple History Mock (Sprint 4 will sync this with pmo_activity_log) */}
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[var(--vibe-surface-2)] border border-[var(--vibe-border)] flex items-center justify-center shrink-0">
                    <History className="w-4 h-4 text-[var(--vibe-text-muted)]" />
                  </div>
                  <div className="w-0.5 flex-1 bg-[var(--vibe-border)] my-1"></div>
                </div>
                <div className="flex flex-col pb-6">
                  <span className="text-[13px] font-bold text-[var(--vibe-text-prime)]">Task Created</span>
                  <span className="text-[11px] text-[var(--vibe-text-muted)]">Today, 10:00 AM · System (Playbook)</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[rgba(97,97,255,0.1)] border border-[rgba(97,97,255,0.2)] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[var(--vibe-purple)]" />
                </div>
                <div className="flex flex-col pb-6">
                  <span className="text-[13px] font-bold text-[var(--vibe-text-prime)]">Status Update</span>
                  <span className="text-[11px] text-[var(--vibe-text-muted)]">Today, 11:30 AM · Employee</span>
                  <p className="mt-1 text-[12px] text-[var(--vibe-text-prime)] italic border-l-2 border-[var(--vibe-border)] pl-3">"Starting technical review of the module..."</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Meta */}
      <div className="mt-auto p-4 border-t border-[var(--vibe-border)] bg-[var(--vibe-surface-2)] flex items-center justify-between">
        <div className="text-[10px] text-[var(--vibe-text-muted)]">
          ID: {task.id}
        </div>
        <div className="text-[10px] text-[var(--vibe-text-muted)] uppercase font-bold">
          {task.orgId}
        </div>
      </div>
    </div>
  );
};
