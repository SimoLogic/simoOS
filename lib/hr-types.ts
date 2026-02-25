// ─── Backward Compatibility Shim ─────────────────────────────────────────────
// This file re-exports from the new canonical location (@/types/hr.types).
// All existing `import { ... } from '@/lib/hr-types'` imports continue to work.
// New code should import from '@/types' or '@/types/hr.types' instead.
// ─────────────────────────────────────────────────────────────────────────────
export * from '@/types/hr.types';
