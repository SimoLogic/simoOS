// ⚠️ LEER ARCHITECTURE.md antes de modificar
// automation-actions.ts — Server Actions CRUD para pmo_automations
// Patrón: "use server" → Zod validation → Service call → return result

"use server";

import { z } from "zod";
import {
  getAutomationsService,
  createAutomationService,
  updateAutomationService,
  deleteAutomationService,
  type PmoAutomation,
} from "@/lib/services/pmo/automation.service";

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────────────────

const OrgIdSchema = z.string().min(1, "tenantId is required");

const TriggerTypeEnum = z.enum(["on_status_change", "on_column_change"]);
const ActionTypeEnum  = z.enum(["set_column", "notify"]);

const TriggerConfigSchema = z.object({
  field: z.string().min(1, "Trigger field is required"),
  value: z.string().min(1, "Trigger value is required"),
});

const ActionConfigSchema = z.object({
  field: z.string().min(1, "Action field is required"),
  value: z.string().min(1, "Action value is required"),
});

const CreateAutomationSchema = z.object({
  tenantId:         OrgIdSchema,
  boardId:       z.string().min(1, "boardId is required"),
  name:          z.string().min(1, "Automation name is required").max(255).trim(),
  triggerType:   TriggerTypeEnum,
  triggerConfig: TriggerConfigSchema,
  actionType:    ActionTypeEnum,
  actionConfig:  ActionConfigSchema,
});

const UpdateAutomationSchema = z.object({
  automationId:  z.string().min(1),
  tenantId:         OrgIdSchema,
  name:          z.string().min(1).max(255).trim().optional(),
  triggerType:   TriggerTypeEnum.optional(),
  triggerConfig: TriggerConfigSchema.optional(),
  actionType:    ActionTypeEnum.optional(),
  actionConfig:  ActionConfigSchema.optional(),
  isActive:      z.boolean().optional(),
});

// ─── RESULT TYPE ──────────────────────────────────────────────────────────────

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

export async function getAutomationsAction(
  boardId: string,
  tenantId:   string
): Promise<PmoAutomation[]> {
  if (!boardId?.trim() || !tenantId?.trim()) return [];
  try {
    return await getAutomationsService(boardId, tenantId);
  } catch (err: unknown) {
    console.error("[PMO Action] getAutomations:", err);
    return [];
  }
}

export async function createAutomationAction(
  input: z.infer<typeof CreateAutomationSchema>
): Promise<ActionResult<PmoAutomation>> {
  try {
    const validated = CreateAutomationSchema.parse(input);
    const automation = await createAutomationService(validated);
    return { success: true, data: automation };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function updateAutomationAction(
  input: z.infer<typeof UpdateAutomationSchema>
): Promise<ActionResult<PmoAutomation>> {
  try {
    const validated = UpdateAutomationSchema.parse(input);
    const { automationId, tenantId, ...fields } = validated;
    const automation = await updateAutomationService(automationId, tenantId, fields);
    return { success: true, data: automation };
  } catch (err: unknown) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues.map(i => i.message).join(", ") };
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteAutomationAction(
  automationId: string,
  tenantId: string
): Promise<ActionResult<void>> {
  if (!automationId?.trim() || !tenantId?.trim()) {
    return { success: false, error: "automationId and tenantId are required" };
  }
  try {
    await deleteAutomationService(automationId, tenantId);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function toggleAutomationAction(
  automationId: string,
  tenantId: string,
  isActive: boolean
): Promise<ActionResult<PmoAutomation>> {
  if (!automationId?.trim() || !tenantId?.trim()) {
    return { success: false, error: "automationId and tenantId are required" };
  }
  try {
    const automation = await updateAutomationService(automationId, tenantId, { isActive });
    return { success: true, data: automation };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
