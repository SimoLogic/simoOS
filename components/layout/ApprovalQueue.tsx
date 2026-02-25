import React from "react";
import { ApprovalRequisition } from "@/lib/growthify-types";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";

interface ApprovalQueueProps {
    requisitions: ApprovalRequisition[];
    onClose: () => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ requisitions, onClose }) => {
    return (
        <div className="absolute right-0 top-full mt-3 w-[450px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[400] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-bold text-navy-blue flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cobalt-blue" />
                    Pending Approvals ({requisitions.length})
                </h3>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {requisitions.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-600">You're all caught up!</p>
                        <p className="text-xs text-slate-400 mt-1">No pending requisitions in your queue.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {requisitions.map(req => (
                            <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                            {req.module} &rsaquo; {req.sub_module} &rsaquo; {req.app}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">
                                            {req.description}
                                        </p>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Role Required: <span className="font-bold text-navy-blue">{req.approver_role}</span>
                                        </div>
                                    </div>

                                    <a
                                        href={req.link_url}
                                        onClick={onClose}
                                        className="shrink-0 ml-4 bg-cobalt-blue hover:bg-navy-blue text-white text-[11px] font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                                    >
                                        GO <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {requisitions.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
                    <p className="text-xs text-slate-400 font-medium">Requisitions require immediate attention.</p>
                </div>
            )}
        </div>
    );
};
