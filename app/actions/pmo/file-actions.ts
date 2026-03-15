"use server";

import { z } from "zod";
import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import { createClient } from "@supabase/supabase-js";

// Initialize a supabase client with anon key for storage uploads, 
// trusting the authenticated session on the client API.
// Note: If uploading from Server Component, we should ideally use supabase/ssr client.
// Here we use a standard approach where client generates FormData.

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface AttachmentRecord {
    id: string;
    task_id: string;
    file_name: string;
    file_size_bytes: number;
    file_type: string;
    storage_path: string;
    created_at: string;
    uploader_id: string;
}

/**
 * Persists the attachment metadata to the database after successful storage upload.
 */
export async function logAttachmentAction(
  taskId: string,
  orgId: string,
  userId: string,
  fileName: string,
  sizeBytes: number,
  mimeType: string,
  storagePath: string
): Promise<{ success: boolean; data?: AttachmentRecord; error?: string }> {
  try {
    if (sizeBytes > MAX_FILE_SIZE) {
        return { success: false, error: "El archivo excede el límite de 10MB." };
    }

    const db = getPmoDB();
    const { data, error } = await db
      .from("pmo_attachments")
      .insert({
        task_id: taskId,
        org_id: orgId,
        uploader_id: userId,
        file_name: fileName,
        file_size_bytes: sizeBytes,
        file_type: mimeType,
        storage_path: storagePath
      })
      .select()
      .single();

    throwIfDbError(error, "logAttachment");

    return { success: true, data: data as AttachmentRecord };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Retrieves attachments metadata for a specific task.
 */
export async function getAttachmentsAction(taskId: string, orgId: string): Promise<AttachmentRecord[]> {
    try {
        const db = getPmoDB();
        const { data, error } = await db
            .from("pmo_attachments")
            .select("*")
            .eq("task_id", taskId)
            .eq("org_id", orgId)
            .order("created_at", { ascending: false });
            
        throwIfDbError(error, "getAttachments");
        return data as AttachmentRecord[];
    } catch {
        return [];
    }
}

/**
 * Deletes an attachment metadata row. 
 * Note: Storage object removal should ideally follow or precede this.
 */
export async function deleteAttachmentAction(attachmentId: string, orgId: string): Promise<boolean> {
     try {
        const db = getPmoDB();
        const { error } = await db
            .from("pmo_attachments")
            .delete()
            .eq("id", attachmentId)
            .eq("org_id", orgId);
            
        if (error) throw error;
        return true;
     } catch {
         return false;
     }
}
