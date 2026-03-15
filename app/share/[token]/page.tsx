"use client";

import React, { useEffect, useState } from "react";
import { resolveShareTokenAction } from "@/app/actions/pmo/share-actions";
import { GridView } from "@/components/pmo/views/GridView";
import { Loader2, AlertCircle, ShieldAlert } from "lucide-react";

export default function SharePage({ params }: { params: { token: string } }) {
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
    const [data, setData] = useState<{ boardId: string, orgId: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function verify() {
            const res = await resolveShareTokenAction(params.token);
            if (res.success && res.boardId && res.orgId) {
                setData({ boardId: res.boardId, orgId: res.orgId });
                setStatus('valid');
            } else {
                setError(res.error || "Token no válido o expirado.");
                setStatus('invalid');
            }
        }
        verify();
    }, [params.token]);

    if (status === 'loading') {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 text-vibe-blue">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Verificando Acceso Seguro...</p>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 text-vibe-dark p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100">
                    <ShieldAlert className="w-8 h-8 text-vibe-red" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
                <p className="text-gray-500 max-w-md">{error}</p>
                <div className="mt-8">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">HOPS Security Protocol - Sprint 11</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="fixed inset-0 bg-white">
            <GridView 
                boardId={data.boardId} 
                orgId={data.orgId} 
                isReadOnly={true} 
            />
        </div>
    );
}
