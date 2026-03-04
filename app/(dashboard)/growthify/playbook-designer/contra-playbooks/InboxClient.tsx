"use client";

import { useState } from "react";
import { markContraTaskComplete } from "@/lib/actions/playbook/contra-playbook";
import { CheckCircle2, ChevronRight, FileText, Calendar, PlaySquare, AlertCircle, Inbox } from "lucide-react";

export function InboxClient({ initialTasks }: { initialTasks: any[] }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleComplete = async () => {
        if (!selectedTask) return;
        setIsSubmitting(true);
        const res = await markContraTaskComplete(selectedTask.id, notes);
        if (res.success) {
            setTasks(tasks.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
            setNotes('');
            alert("Task marked as completed and logged for SLA metrics.");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:flex-row md:h-[600px]">

            {/* Left List Pane */}
            <div className="flex-1 border-b border-gray-200 md:w-1/3 md:border-b-0 md:border-r">
                <div className="border-b border-gray-100 bg-gray-50 p-4">
                    <h2 className="text-sm font-semibold uppercase text-gray-500">Your Pending Tasks ({tasks.length})</h2>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 53px)' }}>
                    {tasks.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                            No pending tasks. You are caught up!
                        </div>
                    ) : (
                        tasks.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className={`w-full border-b border-gray-50 p-4 text-left transition-colors hover:bg-blue-50 focus:outline-none ${selectedTask?.id === t.id ? 'bg-blue-50 border-l-4 border-l-[#002B5B]' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <h3 className="flex-1 text-sm font-medium text-gray-900 group-hover:text-[#002B5B]">
                                        {t.contra_activity_name || "Contra-Task Request"}
                                    </h3>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                </div>
                                <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                                    <PlaySquare className="h-3 w-3" /> {t.dim_playbook?.name}
                                </p>
                                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" /> Due {t.frequency}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Detail Pane */}
            <div className="flex-[2] bg-white p-6 md:p-8 overflow-y-auto">
                {selectedTask ? (
                    <div className="mx-auto max-w-2xl">
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.contra_activity_name || "Support Task"}</h2>
                                <p className="text-sm text-gray-500">
                                    Supporting Step #{selectedTask.step_number} ({selectedTask.dim_playbook_activity_dictionary?.activity_name}) in Playbook <b>{selectedTask.dim_playbook?.name}</b>
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-6">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                                <AlertCircle className="h-4 w-4" /> Purpose of this Support Task
                            </h4>
                            <p className="text-sm text-blue-800">
                                {selectedTask.contra_activity_purpose || "No specific purpose detailed. Support the primary owner's objective."}
                            </p>
                        </div>

                        <div className="mb-8 grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-gray-100 p-4">
                                <label className="text-xs font-semibold uppercase text-gray-500">You must deliver:</label>
                                <p className="mt-1 font-medium text-gray-900">{selectedTask.deliverable_name || "N/A"}</p>
                                <p className="mt-1 text-xs text-gray-500">{selectedTask.deliverable_description}</p>
                            </div>
                            <div className="rounded-lg border border-gray-100 p-4">
                                <label className="text-xs font-semibold uppercase text-gray-500">Recurrence Target:</label>
                                <p className="mt-1 font-medium text-gray-900">{selectedTask.frequency}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="mb-3 text-sm font-semibold text-gray-900">Mark as Completed</h3>
                            <textarea
                                className="w-full rounded-md border p-3 text-sm outline-none focus:border-[#002B5B] focus:ring-1 focus:ring-[#002B5B]"
                                rows={3}
                                placeholder="Add execution notes or links to deliverables (e.g. Google Drive link to creative assets)..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    disabled={isSubmitting}
                                    onClick={handleComplete}
                                    className="flex items-center gap-2 rounded-md bg-[#002B5B] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Processing...' : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" /> Complete Step
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-4 rounded-full bg-gray-50 p-6 shadow-inner">
                            <Inbox className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Select a task to view details</h3>
                        <p className="mt-1 max-w-sm text-sm text-gray-500">
                            Click on any task from your left inbox panel to read instructions and submit your deliverables.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}
