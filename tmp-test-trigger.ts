import { getPmoDB } from "./lib/pmo/pmo-db";

async function testTrigger() {
  console.log("🛡️ Iniciando Verificación de Seguridad de Triggers PMO...");
  const db = getPmoDB();
  const tenantId = "test-org-trigger";

  try {
    // 1. Crear workspace, board y grupo de prueba
    const ws = await db.from("pmo_workspaces").insert({ tenant_id: tenantId, name: "Test WS" }).select().single();
    if (ws.error) throw new Error("Failed to create WS: " + ws.error.message);

    const board = await db.from("pmo_boards").insert({ tenant_id: tenantId, workspace_id: ws.data.id, title: "Test Board" }).select().single();
    if (board.error) throw new Error("Failed to create Board: " + board.error.message);

    const group = await db.from("pmo_groups").insert({ tenant_id: tenantId, board_id: board.data.id, title: "Test Group" }).select().single();
    if (group.error) throw new Error("Failed to create Group: " + group.error.message);

    // 2. Insertar tarea protegida (Regla de Oro #1)
    console.log("Creando tarea protegida...");
    const task = await db.from("pmo_tasks").insert({
      tenant_id: tenantId,
      board_id: board.data.id,
      group_id: group.data.id,
      title: "Protected Playbook Task",
      is_protected: true,
      source_playbook_id: "test-playbook-trigger"
    }).select().single();

    if (task.error) throw new Error("Failed to create Task: " + task.error.message);
    const taskId = task.data.id;
    console.log(`✅ Tarea creada: ${taskId} (is_protected = true)`);

    // 3. INTENTAR BORRAR DIRECTO EN DB (Bypass del Shield 1 y 2)
    console.log("Intentando borrar la tarea directamente en la base de datos (trigger debe bloquearlo)...");
    const delResult = await db.from("pmo_tasks").delete().eq("id", taskId);

    if (delResult.error) {
       console.log("✅ RESULTADO ESPERADO: DB Trigger bloqueó el borrado exitosamente.");
       console.log("Error de PostgreSQL:", delResult.error.message);
    } else {
       console.error("❌ FALLO CRÍTICO: La tarea se borró. El trigger NO está activo.");
    }

    // Cleanup de prueba
    console.log("Limpiando datos de prueba...");
    await db.from("pmo_workspaces").delete().eq("id", ws.data.id);
    
  } catch (err) {
    console.error("❌ Error de test:", err);
  }
}

testTrigger().catch(console.error);
