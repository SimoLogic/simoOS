import { getPmoDB, throwIfDbError } from "@/lib/pmo/pmo-db";
import type { PmoEvent } from "@/types/pmo.types";

export interface CreateEventInput {
  tenantId: string;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
}

export async function createEventService(input: CreateEventInput): Promise<PmoEvent> {
  const db = getPmoDB();
  const { data: event, error } = await db
    .from("pmo_events")
    .insert({
      tenant_id: input.tenantId,
      title: input.title,
      description: input.description,
      start_date_time: input.startDateTime,
      end_date_time: input.endDateTime,
    })
    .select("*")
    .single();

  throwIfDbError(error, "createEventService");
  return event as any;
}
