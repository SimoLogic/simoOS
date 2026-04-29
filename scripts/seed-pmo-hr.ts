import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { addWorkdays } from "../lib/workday-helper";

// Load ENV
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

const supabaseUrl = 'https://eezzumwlucfidzyppllj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlenp1bXdsdWNmaWR6eXBwbGxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwMDAyNywiZXhwIjoyMDg3NDc2MDI3fQ.z3SPINVk3IuN0_Ez32s_azrjxnyS7KOe3kFMqRYHmMA';
const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = "TNT-SEED26"; // Must be <= 15 chars for dim_tenant.tcode

// Helper to strictly catch and crash on Supabase insert errors
const safeInsert = async (table: string, data: any) => {
  const { error } = await supabase.from(table).insert(data);
  if (error) {
    console.error(`❌ FATAL ERROR INSIDE TABLE [${table}]:`, error);
    throw error;
  }
};

// FASE 1: Nombramiento de Roles y Cargos
const rolesConfig = [
  { title: "Branch Manager", family: "Core", scope: "US" },
  { title: "Non-Producing Branch Manager", family: "Core", scope: "US" },
  { title: "Market Leader", family: "Core", scope: "US" },
  { title: "Loan Officer", family: "Core", scope: "US" },
  { title: "Processor", family: "Operations", scope: "COL" },
  { title: "Loan Officer Assistant", family: "Operations", scope: "COL" },
  { title: "Business Developer", family: "Operations", scope: "COL" },
  { title: "Finance Manager", family: "Administrative", scope: "Admin" },
  { title: "HR Manager", family: "Administrative", scope: "Admin" },
  { title: "Finance Analyst", family: "Administrative", scope: "Admin" },
  { title: "HR Analyst", family: "Administrative", scope: "Admin" },
];

const latNames = ["Carlos", "Maria", "Juan", "Ana", "Luis", "Sofia", "Diego", "Valeria", "Jorge", "Camila"];
const latLastNames = ["Mendoza", "Garcia", "Martinez", "Lopez", "Gonzalez", "Perez", "Rodriguez", "Sanchez"];
const usNames = ["James", "Sarah", "Michael", "Emily", "David", "Jessica", "John", "Ashley", "Robert", "Amanda"];
const usLastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez"];

function getRandomName(latino: boolean) {
  const fFirst = latino ? latNames : usNames;
  const fLast = latino ? latLastNames : usLastNames;
  return {
    first: fFirst[Math.floor(Math.random() * fFirst.length)],
    last: fLast[Math.floor(Math.random() * fLast.length)]
  };
}

async function main() {
  console.log("🌱 Iniciando Inyección de Datos con SUPABASE PROD: SIMO Intellisense (Seed 2026)");

  // 1. Limpieza
  console.log(`🧹 Limpiando datos previos del tenant: ${ORG_ID}`);
  await supabase.from('pmo_tasks').delete().eq('org_id', ORG_ID);
  await supabase.from('simo_notifications').delete().eq('org_id', ORG_ID);
  await supabase.from('bp_playbook_steps').delete().eq('org_id', ORG_ID);
  await supabase.from('bp_playbooks').delete().eq('org_id', ORG_ID);
  await supabase.from('hr_employees').delete().eq('org_id', ORG_ID);
  await supabase.from('dim_employee').delete().eq('tenant_id', ORG_ID);
  await supabase.from('dim_job_title').delete().like('name', 'SEED-%');
  await supabase.from('dim_role_title').delete().like('name', 'SEED-%');
  await supabase.from('dim_tenant').delete().eq('tcode', ORG_ID);
  await supabase.from('organizations').delete().eq('id', ORG_ID);

  // Crear Organización
  await safeInsert('organizations', {
    id: ORG_ID,
    name: "HOMESI Seed Testing 2026",
    country_code: "US"
  });

  // Registrar en dim_tenant
  const { error: tenantError } = await supabase.from('dim_tenant').upsert({
    tcode: ORG_ID,
    legal_name: "HOMESI Seed Testing 2026",
    dba_name: "HOMESI Seed Testing",
    reporting_currency: "USD",
    status: true,
    hq_address: { country: "US" },
    pocs: [],
    account_managers: []
  }, { onConflict: 'tcode' });

  if (tenantError) {
    console.error("❌ Error critical insertando dim_tenant:", tenantError);
    throw tenantError;
  }

  // FASE 1: Crear Job Titles y Role Titles
  console.log("🏗️ FASE 1: Creando Job Titles y Role Titles...");
  const roleMap = new Map<string, { job_title_id: string, role_title_id: string, family: string }>();

  for (const r of rolesConfig) {
    const jobId = uuidv4();
    const roleId = uuidv4();
    const safeName = `SEED-${r.title}`;

    await safeInsert('dim_job_title', {
      id: jobId, tenant_id: ORG_ID, title: safeName, area: r.family, status: 'Active'
    });
    // await safeInsert('dim_role_title', {
    //   id: roleId, tenant_id: ORG_ID, job_title_id: jobId, role_title: safeName, status: 'Active'
    // });
    roleMap.set(r.title, { job_title_id: jobId, role_title_id: roleId, family: r.family });
  }

  // FASE 2: Capital Humano (100 Empleados)
  console.log("👥 FASE 2: Generando 100 Empleados...");
  const distribution = [
    { title: "Branch Manager", count: 8, lat: false },
    { title: "Non-Producing Branch Manager", count: 5, lat: false },
    { title: "Market Leader", count: 5, lat: false },
    { title: "Loan Officer", count: 20, lat: false },
    { title: "Processor", count: 10, lat: true },
    { title: "Loan Officer Assistant", count: 10, lat: true },
    { title: "Business Developer", count: 10, lat: true },
    { title: "Finance Manager", count: 5, lat: true },
    { title: "HR Manager", count: 5, lat: true },
    { title: "Finance Analyst", count: 10, lat: true },
    { title: "HR Analyst", count: 12, lat: true }
  ];

  const dimEmpInserts = [];
  const hrEmpInserts = [];
  const generatedEmployees = [];

  let eidCounter = 1;
  for (const dist of distribution) {
    const roleData = roleMap.get(dist.title);
    if (!roleData) continue;

    for (let i = 0; i < dist.count; i++) {
      const empId = uuidv4();
      const name = getRandomName(dist.lat);
      const email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}.${eidCounter}@homesi.seed.com`;
      const eid = `EID-SEED-${eidCounter.toString().padStart(3, '0')}`;

      dimEmpInserts.push({
        eid: eid,
        tenant_id: ORG_ID,
        numero_identificacion: `ID-${eidCounter}`,
        tipo_documento_id: 'CC',
        primer_nombre: name.first,
        primer_apellido: name.last,
        segundo_apellido: 'N/A',
        fecha_nacimiento: '1990-01-01',
        genero: 'M',
        email_personal: email,
        municipio_dane: '11001',
        direccion_residencia: 'Street 123',
        status: 'Active',
        fecha_inicio: '2026-01-01',
        tipo_contrato: 'Indefinido',
        tipo_salario: 'Fijo',
        salario_base: dist.lat ? 5000000 : 5000,
        area: roleData.family,
        sub_area: roleData.family,
        centro_costo: 'CC01',
      });

      hrEmpInserts.push({
        id: empId,
        org_id: ORG_ID,
        eid: eid,
        identificacion_enc: Buffer.from(`ID-${eidCounter}`).toString('base64'), // Mock enc
        tipo_documento: 'CC',
        first_name: name.first,
        last_name: name.last,
        email: email,
        primer_nombre: name.first,
        primer_apellido: name.last,
        fecha_nacimiento: '1990-01-01',
        genero: 'M',
        email_personal: email,
        municipio_dane: '11001',
        direccion_residencia: 'Street 123',
        status: 'Active'
      });

      generatedEmployees.push({ id: empId, eid: eid, title: dist.title });
      eidCounter++;
    }
  }

  await safeInsert('dim_employee', dimEmpInserts);
  await safeInsert('hr_employees', hrEmpInserts);

  // FASE 3: Biblioteca de Playbooks
  console.log("📚 FASE 3: Generando 10 Playbooks Activos...");
  const playbooks = [];
  for (let i = 1; i <= 10; i++) {
    const targetRole = rolesConfig[Math.floor(Math.random() * rolesConfig.length)];
    const playbookId = uuidv4();
    
    await safeInsert('bp_playbooks', {
      id: playbookId,
      org_id: ORG_ID,
      name: `PMO Seed Playbook ${i} - ${targetRole.title}`,
      type: "CORE",
      family: targetRole.family.toUpperCase(),
      strategy: "B2B",
      status: "PUBLISHED"
    });

    const stepCount = Math.floor(Math.random() * 6) + 5;
    const stepInserts = [];
    for (let s = 1; s <= stepCount; s++) {
      stepInserts.push({
        org_id: ORG_ID,
        playbook_id: playbookId,
        uid: `PLB-${i}-${s}`,
        step_num: s.toString().padStart(2, '0'),
        name: `Execute Step ${s} for ${targetRole.title}`
      });
    }
    await safeInsert('bp_playbook_steps', stepInserts);
    
    // Almacenamos the playbooks in memory including steps
    const { data: stepsData } = await supabase.from('bp_playbook_steps').select('*').eq('playbook_id', playbookId);
    playbooks.push({ id: playbookId, role: targetRole.title, steps: stepsData || [] });
  }

  // FASE 4: Ejecución PMO (Asignación)
  console.log("⚙️ FASE 4: Asignando Tareas (WorkdayHelper + Boards)...");
  
  const workspaceId = uuidv4();
  await safeInsert('pmo_workspaces', {
    id: workspaceId,
    org_id: ORG_ID,
    name: "Seed Operation Workspace"
  });

  for (const emp of generatedEmployees) {
    const matchingPlaybooks = playbooks.filter(p => p.role === emp.title);
    if (matchingPlaybooks.length === 0) continue;

    const boardId = uuidv4();
    
    // Satisfy FK constraint
    await safeInsert('pmo_boards', {
      id: boardId,
      org_id: ORG_ID,
      workspace_id: workspaceId,
      title: `Personal Board - ${emp.title} / ${emp.eid}`
    });

    const groupId = `TODO-${boardId}`;
    await safeInsert('pmo_groups', {
      id: groupId,
      org_id: ORG_ID,
      board_id: boardId,
      title: "To Do",
      position: 1
    });

    const taskInserts = [];

    for (const pb of matchingPlaybooks) {
      const startDate = new Date();
      
      for (const step of pb.steps) {
        // Llave #2: Motor de Calendario (USA Base Only)
        const dueDate = addWorkdays(startDate, step.scheduler_value || 0, "US", undefined, "America/New_York", []);
        
        taskInserts.push({
          org_id: ORG_ID,
          board_id: boardId,
          group_id: groupId,
          title: step.name,
          description: `Generated from Playbook Step ${step.uid}`,
          due_date: dueDate.toISOString(),
          status: "not_started"
        });
      }
    }
    if (taskInserts.length > 0) {
      await safeInsert('pmo_tasks', taskInserts);
    }
  }

  console.log("✅ SEED PROD COMPLETADO SATISFACTORIAMENTE!");
}

main().catch(e => {
  console.error("❌ Error ejecutando el Seed PROD:", e);
  process.exit(1);
});
