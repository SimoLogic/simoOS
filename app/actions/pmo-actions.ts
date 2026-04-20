"use server";

import { supabase } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { addDays, startOfDay } from "date-fns";
import { addWorkdays, expandFrequency, isWorkday, toISODate } from "@/lib/workday-helper";
import { v4 as uuidv4 } from "uuid";

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resta días hábiles retrocediendo en el calendario.
 * Utilizado para calcular la fecha límite de tareas de soporte (counteractions),
 * que deben completarse X días hábiles ANTES de que inicie la tarea principal.
 */
function subtractWorkdays(
  start: Date | string,
  workdays: number,
  tenantCountry: string = "US",
  userCountry: string = "CO",
  timezone: string = "UTC",
  extraHolidays: string[] = []
): Date {
  if (workdays < 0) throw new Error("subtractWorkdays: workdays must be >= 0");

  let current = startOfDay(typeof start === "string" ? new Date(start) : start);

  // Si la fecha inicial no es hábil, retroceder hasta encontrar el primer día hábil
  while (!isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) {
    current = addDays(current, -1);
  }

  let remaining = workdays;
  while (remaining > 0) {
    current = addDays(current, -1);
    if (isWorkday(current, tenantCountry, userCountry, timezone, extraHolidays)) {
      remaining--;
    }
  }

  return current;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssignPlaybookInput {
  playbookId: string;
  employeeEids: string[];
  startDate: Date | string;
  orgId: string;
  assignedByEid: string;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta el motor de asignación de playbooks:
 * 1. Calcula las fechas exactas de ejecución mediante WorkdayHelper (saltando festivos/fines de semana).
 * 2. Autocrea boards personales de PMO si el empleado no los tiene.
 * 3. Crea todas las instancias (PLAYBOOK_TASK) para el asignado.
 * 4. Crea las tareas de soporte (SUPPORT_REQUEST) para las counteractions (con status='blocked' si corresponde).
 * 5. Envía notificaciones a los involucrados en simo_notifications.
 */
export async function assignPlaybookAction(input: AssignPlaybookInput) {
  const { playbookId, employeeEids, startDate, orgId, assignedByEid } = input;

  if (!playbookId || !employeeEids.length || !startDate || !orgId) {
    throw new Error("Missing required fields for Playbook Assignment");
  }

  // 1. Obtener la definición del Playbook y sus Steps
  const { data: playbook, error: pbErr } = await supabase
    .from("bp_playbooks")
    .select("name")
    .eq("id", playbookId)
    .single();

  if (pbErr || !playbook) throw new Error("Playbook not found");

  const { data: steps, error: stpErr } = await supabase
    .from("bp_playbook_steps")
    .select("*")
    .eq("playbook_id", playbookId)
    .order("position", { ascending: true });

  if (stpErr || !steps || steps.length === 0) {
    throw new Error("No steps found for this playbook");
  }

  // Config básica para el motor de días (Idealmente vendría de org config)
  const orgConfig = {
    timezone: "UTC",
    tenantCountry: "US",
    userCountry: "CO",
    extraHolidays: [],
  };

  const tasksToInsert: any[] = [];
  const notificationsToInsert: any[] = [];
  const baseStart = new Date(startDate);

  // Batch por empleado para resolver boards
  for (const eid of employeeEids) {
    // 2. Resolver PMO Board del Empleado (My Plan — [EID])
    let boardId = "";
    const boardName = `My Plan — ${eid}`;
    const { data: existingBoard } = await supabase
      .from("pmo_boards")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", boardName)
      .eq("type", "PERSONAL")
      .single();

    if (existingBoard) {
      boardId = existingBoard.id;
    } else {
      // Autocreate board
      const { data: newBoard, error: boardErr } = await supabase
        .from("pmo_boards")
        .insert({
          org_id: orgId,
          name: boardName,
          type: "PERSONAL",
          is_active: true
        })
        .select("id")
        .single();
      
      if (boardErr) throw new Error("Could not create PMO Board: " + boardErr.message);
      boardId = newBoard.id;
    }

    // 2b. Create or find a group for this playbook assignment
    const groupTitle = `${playbook.name} — Assigned ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    let groupId = "";
    
    const { data: existingGroup } = await supabase
      .from("pmo_groups")
      .select("id")
      .eq("board_id", boardId)
      .eq("org_id", orgId)
      .ilike("title", `${playbook.name}%`)
      .limit(1)
      .single();

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      const { data: newGroup, error: grpErr } = await supabase
        .from("pmo_groups")
        .insert({
          board_id: boardId,
          org_id: orgId,
          title: groupTitle,
          color: "#6161FF",
          position: 0,
          is_collapsed: false,
        })
        .select("id")
        .single();

      if (grpErr) throw new Error("Could not create PMO Group: " + grpErr.message);
      groupId = newGroup.id;
    }

    // 3. Iterar los steps escalonados en el tiempo
    let lastStepMaxDate = baseStart;

    for (const step of steps) {
      let stepStartDate: Date;

      if (step.step_num === "1" || step.position === 1) {
        // Regla: inicio_paso_1 = addWorkdays(startDate, 1) -> 1 día de buffer
        stepStartDate = addWorkdays(baseStart, 1, orgConfig.tenantCountry, orgConfig.userCountry, orgConfig.timezone, orgConfig.extraHolidays);
      } else {
        // Regla: inicio = addWorkdays(ultimo_dia_paso_anterior, step.scheduler_value || 0)
        const delay = step.scheduler_value ? Number(step.scheduler_value) : 0;
        stepStartDate = addWorkdays(lastStepMaxDate, delay, orgConfig.tenantCountry, orgConfig.userCountry, orgConfig.timezone, orgConfig.extraHolidays);
      }

      // 4. Expandir frecuencia
      const freqConfig = {
        type: (step.frequency || "ONCE") as any,
        occurrences: step.repetitions ? Number(step.repetitions) : 1
      };
      
      const occurrences = expandFrequency(freqConfig, stepStartDate, orgConfig);

      // Actualizar el cursor temporal al último día de este step para el siguiente step
      if (occurrences.length > 0) {
        lastStepMaxDate = occurrences[occurrences.length - 1].date;
      }

      // 5. Crear la PLAYBOOK_TASK para cada ocurrencia
      for (const occ of occurrences) {
        const playbookTaskId = uuidv4();
        
        let targetAssigneeId = eid; // Por defecto el manager le asigna a 'eid', 
                                     // pero si status = ACTIVE y el playbook exige,
                                     // se lo estamos inyectando directo en su board.

        // Tarea Principal
        tasksToInsert.push({
          id: playbookTaskId,
          org_id: orgId,
          board_id: boardId,
          group_id: groupId,
          task_type: "PLAYBOOK_TASK",
          title: `${step.name} (${occ.occurrenceIndex + 1}/${occurrences.length})`,
          assignee_id: targetAssigneeId,
          due_date: occ.isoDate,
          source_playbook_id: playbookId,
          source_playbook_task_id: step.id,
          occurrence_index: occ.occurrenceIndex,
          is_protected: true,
          status: "not_started"
        });

        // 6. Crear Tarea de Soporte (Counteraction) si amerita
        if (step.requested_to && (step.support_task || step.supporting_task)) {
          // Calcular fecha límite del soporte (1 día antes)
          const supportDueDate = subtractWorkdays(
            occ.date, 
            1, 
            orgConfig.tenantCountry, 
            orgConfig.userCountry, 
            orgConfig.timezone, 
            orgConfig.extraHolidays
          );

          // Buscar empleado elegido para el soporte (limit 1)
          const { data: supportEmps } = await supabase
            .from("dim_employee")
            .select("eid")
            .eq("tenant_id", orgId)
            .eq("status", "Active")
            .eq("role_title", step.requested_to)
            .limit(1);

          if (supportEmps && supportEmps.length > 0) {
            const supportAssigneeEid = supportEmps[0].eid;
            const supportTaskId = uuidv4();
            const supportTaskDesc = step.support_task || step.supporting_task;

            // Inyectar en el array la SUPPORT_REQUEST
            tasksToInsert.push({
              id: supportTaskId,
              org_id: orgId,
              board_id: boardId,
              group_id: groupId,
              task_type: "SUPPORT_REQUEST",
              title: `Support: ${step.name} — ${supportTaskDesc}`,
              assignee_id: supportAssigneeEid,
              requested_by_eid: targetAssigneeId,
              due_date: toISODate(supportDueDate, orgConfig.timezone),
              source_playbook_id: playbookId,
              is_protected: false,
              status: "not_started"
            });

            // 7. Conectar bloqueo bi-direccional
            // Si el paso principal está bloqueado por este soporte
            if (step.is_blocking) {
               // Encontramos la tarea principal que recién insertamos y la actualizamos
               const pTask = tasksToInsert.find(t => t.id === playbookTaskId);
               if (pTask) {
                 pTask.status = "blocked";
                 pTask.blocking_task_id = supportTaskId;
               }
            }

            // Notification to Support Team
            notificationsToInsert.push({
              org_id: orgId,
              user_id: supportAssigneeEid, // EID
              type: "APPROVAL",
              title: "You have a pending support requisition",
              message: `Support requested for playbook "${playbook.name}"`,
              action_url: "/pmo/my-queue",
              is_read: false
            });
          }
        }
      }
    }

    // Notification to assignee
    notificationsToInsert.push({
      org_id: orgId,
      user_id: eid, // EID
      type: "TASK",
      title: `Playbook "${playbook.name}" has been assigned to you`,
      message: `The playbook is now active in your execution plan. Check your My Plan view.`,
      action_url: "/pmo/my-plan",
      is_read: false
    });
  }

  // 8. Inserciones Masivas en Transacción
  if (tasksToInsert.length > 0) {
    const { error: insTasksErr } = await supabase.from("pmo_tasks").insert(tasksToInsert);
    if (insTasksErr) throw new Error("Error inserting tasks: " + insTasksErr.message);
  }

  if (notificationsToInsert.length > 0) {
    const { error: insNotDb } = await supabase.from("simo_notifications").insert(notificationsToInsert);
    if (insNotDb) console.error("[PMO Action] Warning: could not insert notifications", insNotDb);
  }

  revalidatePath("/pmo/my-plan");
  revalidatePath("/business-plan/playbooks");

  return { 
    success: true, 
    tasksCreated: tasksToInsert.length 
  };
}
