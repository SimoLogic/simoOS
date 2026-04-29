"use client";

import React, { useState } from "react";
import { UploadCloud, File as FileIcon, X, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { logAttachmentAction } from "@/app/actions/pmo/file-actions";

// Initialize client (assumes env variables exist on client-side Next.js setup)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface FileUploaderProps {
    taskId: string;
    orgId: string;
    userId: string;
    onUploadComplete?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ taskId, orgId, userId, onUploadComplete }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateAndUpload = async (file: File) => {
        setError(null);
        if (file.size > MAX_SIZE_BYTES) {
            setError(`File "${file.name}" exceeds the ${MAX_SIZE_MB}MB limit.`);
            return;
        }

        setUploading(true);
        try {
            // 1. Generate unique path
            const ext = file.name.split('.').pop();
            const storagePath = `${orgId}/${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            // 2. Upload to Supabase Storage
            const { error: storageError } = await supabase.storage
                .from('pmo-files')
                .upload(storagePath, file, { upsert: false });

            if (storageError) throw new Error(storageError.message);

            // 3. Log into our PMO schema
            const res = await logAttachmentAction(taskId, orgId, userId, file.name, file.size, file.type, storagePath);
            
            if (!res.success) throw new Error(res.error);

            if (onUploadComplete) onUploadComplete();
        } catch (err: unknown) {
            setError((err as Error).message || "Fallo durante la subida.");
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndUpload(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full flex justify-center">
           <div 
             className={`w-[400px] border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors relative
                ${isDragging ? 'border-vibe-blue bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50/20'}
                ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
             onDrop={handleDrop}
           >
              {uploading ? (
                 <div className="flex flex-col items-center text-vibe-blue py-2">
                     <Loader2 className="w-8 h-8 animate-spin mb-2" />
                     <p className="text-sm font-semibold tracking-wide">Subiendo a la Nube...</p>
                 </div>
              ) : (
                 <>
                    <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-vibe-blue' : 'text-gray-400'}`} />
                    <p className="text-sm font-semibold text-vibe-dark text-center mb-1">
                       Drag a file or <span className="text-vibe-blue underline cursor-pointer hover:text-blue-700 relative">browse<input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} /></span>
                    </p>
                    <p className="text-xs text-gray-500 font-medium">Límite: {MAX_SIZE_MB}MB (PDF, DOCX, XLSX, JPG, PNG)</p>
                 </>
              )}

              {error && (
                 <div className="absolute -bottom-10 left-0 w-full flex items-center gap-1 text-action-red bg-rose-50 px-3 py-1.5 rounded-md border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-semibold">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto hover:bg-rose-100 rounded p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                 </div>
              )}
           </div>
        </div>
    );
};
