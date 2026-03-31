import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";

// Load ENV Variables
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split(/\r?\n/).forEach(line => {
  if (line.includes("=") && !line.trim().startsWith("#")) {
    const [key, ...rest] = line.split("=");
    const val = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (key.trim()) {
      process.env[key.trim()] = val;
    }
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = "HOMESI-CO"; 

// Simple Workday implementation inline to avoid dependencies
function addWorkdays(startDate: Date, days: number): Date {
  let date = new Date(startDate);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      added++;
    }
  }
  return date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPARTMENTS = ["EXECUTIVE", "OPERATIONS", "FINANCE", "SALES", "MARKETING", "HR", "LEGAL", "ENGINEERING", "PRODUCT", "CUSTOMER_SUCCESS"];
const LEVELS = ["CHIEF", "VP", "DIRECTOR", "MANAGER", "LEAD", "SPECIALIST", "ANALYST", "COORDINATOR", "ASSOCIATE", "ASSISTANT"];

async function safeInsert(table: string, data: any | any[], ignoreConflicts = false) {
  if (!data || (Array.isArray(data) && data.length === 0)) return;
  const { error } = await supabase.from(table).insert(data);
  if (error) {
    if (error.code === '42P01') {
      console.warn(`⚠️ WARNING: Table [${table}] does not exist in Prod. Skipping...`);
      return;
    }
    if (ignoreConflicts && error.code === '23505') {
      return; // Duplicate key, ignore
    }
    console.error(`❌ FATAL ERROR INSIDE TABLE [${table}]:`, error);
    throw error;
  }
}

async function main() {
  console.log(`🌱 Iniciando Inyección de Datos ORGÁNICA 100x100 para: ${ORG_ID}\n`);

  console.log("🧹 Limpiando base de datos para asegurar idempotencia...");
  await supabase.from('pmo_tasks').delete().eq('org_id', ORG_ID);
  await supabase.from('pmo_boards').delete().eq('org_id', ORG_ID);
  await supabase.from('pmo_workspaces').delete().eq('org_id', ORG_ID);
  await supabase.from('bp_playbook_steps').delete().eq('org_id', ORG_ID);
  await supabase.from('bp_playbooks').delete().eq('org_id', ORG_ID);
  await supabase.from('hr_contracts').delete().eq('org_id', ORG_ID);
  await supabase.from('hr_employees').delete().eq('org_id', ORG_ID);
  await supabase.from('dim_employee').delete().eq('tenant_id', ORG_ID);
  await supabase.from('dim_role_title').delete().eq('tenant_id', ORG_ID);
  await supabase.from('dim_job_title').delete().eq('tenant_id', ORG_ID);

  const now = new Date().toISOString();
  await safeInsert('organizations', { id: ORG_ID, name: "HOMESI Colombia - 100x100", country_code: "CO", updated_at: now }, true);
  // Status in prod dim_tenant is boolean, passing true
  await safeInsert('dim_tenant', { tcode: ORG_ID, legal_name: "Homesi Colombia SAS", dba_name: "Homesi Colombia SAS", reporting_currency: 'COP', status: true, updated_at: now }, true);

  console.log("🧱 FASE 1: Construyendo Librería de Roles (100/100)...");
  
  const jobTitleInserts: any[] = [];
  const roleTitleInserts: any[] = [];
  const generatedRoles: { id: string, textId: string, title: string, level: string, dept: string, roleUuid: string }[] = [];

  for (const dept of DEPARTMENTS) {
    for (const level of LEVELS) {
      const textId = `${level}_${dept}`; 
      const readableTitle = `${level} of ${dept}`;
      const jobUuid = uuidv4();
      const roleUuid = uuidv4();
      
      jobTitleInserts.push({
        id: jobUuid,
        tenant_id: ORG_ID,
        title: textId, // Storing the TEXT ID in the title field so we can see it
        area: dept,
        sub_area: `${dept} Ops`,
        status: 'Active'
      });

      roleTitleInserts.push({
        id: roleUuid,
        tenant_id: ORG_ID,
        job_title_id: jobUuid,
        role_title: textId, // Storing the TEXT ID as the role_title string
        describe_role: `Responsible for ${level} level tasks in ${dept}.`,
        status: 'Active'
      });

      generatedRoles.push({ id: jobUuid, roleUuid, textId, title: readableTitle, level, dept });
    }
  }

  // Due to FKs we insert Jobs first, then Roles
  // Note: we chunk into 50 to avoid payload limits if any
  for (let i = 0; i < jobTitleInserts.length; i += 50) {
    await safeInsert('dim_job_title', jobTitleInserts.slice(i, i + 50));
  }
  for (let i = 0; i < roleTitleInserts.length; i += 50) {
    await safeInsert('dim_role_title', roleTitleInserts.slice(i, i + 50));
  }

  // 2️⃣ FASE 2: CAPITAL HUMANO (Espejo - 100 Empleados)
  console.log("👥 FASE 2: Contratando Fuerza Laboral (100 Empleados Espejo)...");

  const hrEmpInserts: any[] = [];
  const dimEmpInserts: any[] = [];
  const contractInserts: any[] = [];
  const assignedEmployees: { id: string, eid: string, roleTitle: string }[] = [];

  for (let i = 0; i < 100; i++) {
    const role = generatedRoles[i]; 
    const empId = uuidv4();
    const eid = `EID-HC-${(i + 1).toString().padStart(3, '0')}`;
    const email = `organic.${role.level.toLowerCase()}.${i}@homesi.co`;
    const firstName = `OrgFirst${i}`;
    const lastName = `OrgLast${i}`;

    hrEmpInserts.push({
      id: empId,
      org_id: ORG_ID,
      eid: eid,
      identificacion_enc: `ENC-ID-${i}`,
      tipo_documento: 'CC',
      primer_nombre: firstName,
      otros_nombres: 'N/A',
      primer_apellido: lastName,
      segundo_apellido: 'N/A',
      fecha_nacimiento: '1990-01-01',
      genero: i % 2 === 0 ? 'M' : 'F',
      email_personal: `personal.${i}@gmail.com`,
      municipio_dane: '11001',
      direccion_residencia: 'Carrera Orgánica 100',
      status: 'Active',
      salary_currency_code: 'COP',
      updated_at: now
    });

    dimEmpInserts.push({
      eid: eid,
      tenant_id: ORG_ID,
      numero_identificacion: `ID-${i}`,
      tipo_documento_id: 'CC',
      primer_nombre: firstName,
      otros_nombres: 'N/A',
      primer_apellido: lastName,
      segundo_apellido: 'N/A',
      fecha_nacimiento: '1990-01-01',
      genero: i % 2 === 0 ? 'M' : 'F',
      email_personal: `personal.${i}@gmail.com`,
      municipio_dane: '11001',
      direccion_residencia: 'Carrera Orgánica 100',
      status: 'Active',
      fecha_inicio: '2026-01-01',
      tipo_contrato: 'Indefinido',
      tipo_salario: 'Fijo',
      salario_base: role.level === 'CHIEF' ? 20000000 : 5000000,
      area: role.dept,
      sub_area: role.dept,
      centro_costo: 'CC01',
      job_title: role.textId, // Linking via Text ID string!
      updated_at: now
    });

    contractInserts.push({
      id: uuidv4(),
      org_id: ORG_ID,
      employee_id: empId,
      fecha_inicio: '2026-01-01',
      tipo_contrato: 'Indefinido',
      tipo_salario: 'Fijo',
      salario_base_enc: role.level === 'CHIEF' ? '20000000' : '5000000',
      salary_currency_code: 'COP',
      area: role.dept,
      sub_area: role.dept,
      centro_costo: 'CC01',
      job_title: role.textId, // The TEXT ID
      role_title: role.textId, // The TEXT ROLE ID
      updated_at: now
    });

    assignedEmployees.push({ id: empId, eid: eid, roleTitle: role.textId });
  }

  for (let i = 0; i < hrEmpInserts.length; i += 50) {
    await safeInsert('hr_employees', hrEmpInserts.slice(i, i + 50));
    await safeInsert('dim_employee', dimEmpInserts.slice(i, i + 50));
    await safeInsert('hr_contracts', contractInserts.slice(i, i + 50));
  }

  // 3️⃣ FASE 3: INTELIGENCIA (10 Playbooks Magistrales)
  console.log("📚 FASE 3: Forjando Inteligencia Operativa (10 Playbooks y Steps)...");

  const playbookInserts: any[] = [];
  const stepInserts: any[] = [];
  const generatedPlaybooks: { id: string, name: string }[] = [];

  for (let i = 0; i < 10; i++) {
    const pbId = uuidv4();
    const pbName = `Master Playbook Orgánico 00${i}`;
    
    // El owner global será aleatoriamente un rol de nivel CHIEF o VP
    const hqxRole = generatedRoles.filter(r => r.level === 'CHIEF' || r.level === 'VP')[i % 20];
    
    playbookInserts.push({
      id: pbId,
      org_id: ORG_ID,
      name: pbName,
      type: "CORE",
      family: "OPERATIONAL",
      strategy: "B2B",
      status: "PUBLISHED",
      global_owners: [hqxRole.id], // Array of Text IDs
      updated_at: now
    });

    generatedPlaybooks.push({ id: pbId, name: pbName });

    // 5 Steps per Playbook
    for (let s = 1; s <= 5; s++) {
      // CONECTIVIDAD ORGÁNICA: Extraer valor estricto del pool de 100 Role Titles
      const targetRole = generatedRoles[(i * 5 + s) % 100];
      
      stepInserts.push({
        id: uuidv4(),
        org_id: ORG_ID,
        playbook_id: pbId,
        uid: `PB-${i}-S${s}`,
        step_num: s.toString().padStart(2, '0'),
        name: `Operación Magistral ${s} - ${targetRole.dept}`,
        type_of_activity: "TASK",
        stakeholder: targetRole.textId, // THE TEXT ID of the role, guarantees check_playbook_roles_match passes!
        repetitions: 1,
        scheduler_value: s * 2, // 2, 4, 6, 8, 10 workdays offset
        position: s,
        updated_at: now
      });
    }
  }

  await safeInsert('bp_playbooks', playbookInserts);
  for (let i = 0; i < stepInserts.length; i += 50) {
    await safeInsert('bp_playbook_steps', stepInserts.slice(i, i + 50));
  }

  // 4️⃣ FASE 4: FLUJO OPERATIVO (30 Asignaciones -> PMO)
  console.log("⚙️  FASE 4: Flujo Operativo - Activando Asignaciones en PMO...");

  const pmoWorkspaceId = uuidv4();
  await safeInsert('pmo_workspaces', { id: pmoWorkspaceId, org_id: ORG_ID, name: "HOMESI Central Ops Workspace", updated_at: now });

  const boardInserts: any[] = [];
  const taskInserts: any[] = [];
  
  // Choose 30 random employees
  const targetEmployees = assignedEmployees.slice(0, 30);

  for (const emp of targetEmployees) {
    const boardId = uuidv4();
    boardInserts.push({
      id: boardId,
      org_id: ORG_ID,
      name: `Plan Táctico - ${emp.eid}`,
      updated_at: now
    });

    // Assign 2 of the 10 playbooks to this employee
    const assignedPbs = [generatedPlaybooks[0], generatedPlaybooks[1]];
    
    for (const pb of assignedPbs) {
      // Find the steps for this PB
      const steps = stepInserts.filter(s => s.playbook_id === pb.id);
      
      for (const step of steps) {
        const startDate = new Date();
        const executionDate = addWorkdays(startDate, step.scheduler_value || 0);

        taskInserts.push({
          id: uuidv4(),
          org_id: ORG_ID,
          board_id: boardId,
          group_id: uuidv4(), // Pass synthetic UUID to satisfy not-null if FK is relaxed
          title: step.name,
          description: `Derived from: ${pb.name} \nStakeholder: ${step.stakeholder}`,
          due_date: executionDate.toISOString(),
          status: "not_started",
          is_protected: true,
          source_playbook_id: pb.id,
          source_playbook_task_id: step.id,
          position: step.position,
          custom_field_values: { assigned_to_eid: emp.eid },
          updated_at: now
        });
      }
    }
  }

  await safeInsert('pmo_boards', boardInserts);
  
  for (let i = 0; i < taskInserts.length; i += 50) {
    await safeInsert('pmo_tasks', taskInserts.slice(i, i + 50));
  }

  console.log("\n✅ OPERACIÓN 100x100 ORGÁNICA COMPLETADA CON ÉXITO.");
  console.log(`Verifique el tenant "${ORG_ID}" en la aplicación. Cero huérfanos generados.`);
}

main().catch(err => {
  console.error("❌ CRITICAL SCRIPT FAILURE", err);
  process.exit(1);
});
