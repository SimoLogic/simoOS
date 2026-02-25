// ─────────────────────────────────────────────────────────────────────────────
// HOPSI H-OS · Storage Service
// Centralized file upload/download helper for Supabase Storage.
//
// Bucket Architecture:
//   avatars    → Public.  Employee profile photos.       Max: 2MB
//   legal-docs → Private. Employee/Tenant documents.    Max: 5MB
//   reports    → Private. Generated reports/exports.   Max: 5MB
//
// RULE: The database stores ONLY the storage path string (e.g. 'avatars/TNT-001/EID-001/avatar.jpg').
//       BinaryFiles are NEVER persisted in the DB. Signed URLs are generated on demand.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/database';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum file sizes enforced on BOTH client and server */
export const FILE_SIZE_LIMITS = {
    IMAGE: 2 * 1024 * 1024,    // 2MB — avatars
    DOCUMENT: 5 * 1024 * 1024, // 5MB — legal-docs, reports
} as const;

export const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour default

export type StorageBucket = 'avatars' | 'legal-docs' | 'reports';

// ─── File Type Guards ─────────────────────────────────────────────────────────

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Validates file before upload. Throws with a user-friendly message on failure. */
export function validateFileUpload(
    file: File,
    bucket: StorageBucket
): void {
    if (bucket === 'avatars') {
        if (!IMAGE_TYPES.includes(file.type)) {
            throw new Error(`Invalid file type. Avatars must be JPEG, PNG, WebP, or GIF.`);
        }
        if (file.size > FILE_SIZE_LIMITS.IMAGE) {
            throw new Error(`File too large. Avatar images must be under 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
        }
    } else {
        // legal-docs and reports
        if (bucket === 'legal-docs' && !DOC_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
            throw new Error(`Invalid file type. Legal documents must be PDF, Word, or image files.`);
        }
        if (file.size > FILE_SIZE_LIMITS.DOCUMENT) {
            throw new Error(`File too large. Documents must be under 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
        }
    }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResult {
    path: string;      // The storage path to save in the DB
    publicUrl?: string; // Only populated for the 'avatars' bucket
}

/**
 * Uploads a file to the specified Supabase bucket.
 * Validates file size & type BEFORE sending to the server.
 * Returns the storage path to be persisted in the database.
 */
export async function uploadFile(
    bucket: StorageBucket,
    path: string,
    file: File,
    options?: { upsert?: boolean }
): Promise<UploadResult> {
    // ── Client-side guardian (first line of defense) ──
    validateFileUpload(file, bucket);

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: options?.upsert ?? false,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const result: UploadResult = { path: data.path };

    if (bucket === 'avatars') {
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);
        result.publicUrl = urlData.publicUrl;
    }

    return result;
}

// ─── Signed URL (Private Files) ───────────────────────────────────────────────

/**
 * Generates a temporary signed URL for a private bucket file.
 * Default expiry: 1 hour. Set `expiresIn` (seconds) to override.
 *
 * Pattern:
 *   1. Read the path from DB (e.g., dim_employee.contract_path)
 *   2. Call getSignedUrl(bucket, path) → temporary URL
 *   3. Send URL to the client — it auto-expires, keeping data secure.
 */
export async function getSignedUrl(
    bucket: 'legal-docs' | 'reports',
    path: string,
    expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
        throw new Error(`Could not generate signed URL: ${error?.message ?? 'Unknown error'}`);
    }

    return data.signedUrl;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Removes a file from the specified bucket.
 * Called when an employee record is deleted or a document is replaced.
 */
export async function deleteFile(
    bucket: StorageBucket,
    path: string
): Promise<void> {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

// ─── Path Builder Helpers ─────────────────────────────────────────────────────

/** Constructs a standardized avatar path: avatars/{tenantId}/{eid}/{filename} */
export function buildAvatarPath(tenantId: string, eid: string, filename: string): string {
    const ext = filename.split('.').pop() ?? 'jpg';
    return `${tenantId}/${eid}/avatar.${ext}`;
}

/** Constructs a standardized legal document path: legal-docs/{tenantId}/{eid}/{filename} */
export function buildLegalDocPath(tenantId: string, eid: string, filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tenantId}/${eid}/${timestamp}_${filename}`;
}

/** Constructs a standardized report path: reports/{tenantId}/{type}/{filename} */
export function buildReportPath(tenantId: string, reportType: string, filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${tenantId}/${reportType}/${timestamp}_${filename}`;
}
