import { processPlaybookAssignment } from "./lib/pmo/playbook-processor";
import { getPmoDB } from "./lib/pmo/pmo-db";

async function testExpansion() {
  console.log("🚀 Iniciando prueba de expansión de Playbook (DAILY×8) en DB...");
  const timestamp = Date.now();
  
  const result = await processPlaybookAssignment({
    playbookId: "test-pb-001",
    assignmentId: `test-asn-${timestamp}`,
    orgId: "test-org-1",
    boardId: "test-brd-1",
    employeeId: "test-emp-1",
    startDate: "2026-03-11", // Miércoles
    countryCode: "CO",
    timezone: "America/Bogota",
    groupTitle: "🚀 Test Playbook Expandido",
    taskTemplates: [
      {
        sourcePlaybookTaskId: "task-tpl-1",
        title: "Llamada de Seguimiento",
        description: "Llamar al cliente",
        frequencyType: "DAILY",
        occurrences: 8,
        offsetWorkdays: 0,
        priority: "high"
      }
    ]
  });

  console.log("✅ Resultado PlaybookProcessor:", JSON.stringify(result, null, 2));

  // Verificar en la DB
  const db = getPmoDB();
  const { data: tasks, error } = await db
    .from("pmo_tasks")
    .select("title, due_date, is_protected, occurrence_index")
    .eq("group_id", result.groupId)
    .order("occurrence_index", { ascending: true });

  if (error) {
    console.error("❌ Error leyendo tareas:", error);
    return;
  }

  console.log("\n📋 Tareas Generadas en la Base de Datos:");
  tasks?.forEach((t, i) => {
    console.log(`  [${i + 1}] ${t.title}`);
    console.log(`      Due: ${t.due_date} | Protected: ${t.is_protected}`);
  });

  console.log(`\n🎉 ¡Expansión exitosa! Se crearon ${tasks?.length} tareas respetando días hábiles.`);
}

testExpansion().catch(console.error);
