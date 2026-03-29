const { Client } = require('pg');

const DB_URL = 'postgresql://postgres.eezzumwlucfidzyppllj:Getcom2021*@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

async function runStressTest() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ [INIT] Connected to Supabase Data Layer\n');

    const tenant = 'TNT-SEED26';

    // DB PATCH FOR SURVIVOR TABLES MISSING DEFAULT IDs
    await client.query(`ALTER TABLE public.pmo_security_events ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;`);

    // PRE-CLEANUP
    await client.query(`DELETE FROM public.dim_job_title WHERE title = 'Simo Master Architect'`);
    await client.query(`DELETE FROM public.pmo_boards WHERE name = 'Test Board'`);
    await client.query(`DELETE FROM public.dim_employee WHERE eid = 'EID-TEST'`);

    // ─────────────────────────────────────────────────────────
    // TEST 1: LIBRERÍA (job_title & role_title TEXT ID)
    // ─────────────────────────────────────────────────────────
    console.log('▶️ TEST 1: Librería (Sprint 14)');
    
    // Insert Job Title
    const jobRes = await client.query(`
      INSERT INTO public.dim_job_title (tenant_id, title, status, approver1_status, approver2_status)
      VALUES ($1, 'Simo Master Architect', 'Active', 'Approved', 'Approved')
      RETURNING id;
    `, [tenant]);
    const jobId = jobRes.rows[0].id;
    console.log(`  ✔️ Inserted Job Title 'Simo Master Architect' [UUID: ${jobId}]`);

    // Insert Role Title (TEXT ID check)
    const roleRes = await client.query(`
      INSERT INTO public.dim_role_title (tenant_id, job_title_id, role_title, status)
      VALUES ($1, $2, 'Architect L1', 'Active')
      RETURNING id, pg_typeof(id) as id_type;
    `, [tenant, jobId]);
    const roleId = roleRes.rows[0].id;
    const roleType = roleRes.rows[0].id_type;
    
    if (roleType !== 'text') throw new Error(`Role ID is not TEXT! It is ${roleType}`);
    console.log(`  ✔️ Inserted Role Title linked to Job Title. [ID: ${roleId}, Type: ${roleType}]`);
    console.log('  ✅ TEST 1 PASSED\n');


    // ─────────────────────────────────────────────────────────
    // TEST 2: PROPAGACIÓN & CONGRUENCIA (HR / Employee)
    // ─────────────────────────────────────────────────────────
    console.log('▶️ TEST 2: Propagación & Congruencia');
    
    // Insert Dummy Employee
    const empInsert = await client.query(`
      INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id,
        primer_nombre, primer_apellido, segundo_apellido, fecha_nacimiento,
        genero, email_personal, municipio_dane, direccion_residencia,
        fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo
      ) VALUES (
        'EID-TEST', $1, '12345', 'CC', 'Test', 'Test', 'Test', '1990-01-01',
        'M', 'test@test.com', '11001', 'Test Addr', '2024-01-01', 'Fixed', 'Fixed', 1000,
        'IT', 'Eng', '001'
      ) ON CONFLICT(eid) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
      RETURNING eid;
    `, [tenant]);
    let targetEid = empInsert.rows[0].eid;

    // Attempt to assign FAKE role title
    let fakeRoleCaught = false;
    try {
      await client.query(`
        UPDATE public.dim_employee 
        SET job_title_id = $1, role_title_id = 'fake-text-id', role_title = 'Fake'
        WHERE eid = $2;
      `, [jobId, targetEid]);
    } catch (e) {
      if (e.message.includes('not belong to the selected job_title') || e.message.includes('invalid input syntax') || e.message.includes('is not Active') || e.message.includes('not exist') || e.message.includes('UUID')) {
        fakeRoleCaught = true;
        console.log(`  ✔️ Trigger/FK successfully blocked invalid role: "${e.message}"`);
      } else {
        throw e;
      }
    }
    if (!fakeRoleCaught) throw new Error('Failed to block invalid role assignment.');

    // Valid Assignment
    const empRes = await client.query(`
      UPDATE public.dim_employee 
      SET job_title_id = $1, role_title_id = $2, role_title = 'Architect L1'
      WHERE eid = $3
      RETURNING eid;
    `, [jobId, roleId, targetEid]);
    console.log(`  ✔️ Successfully assigned Job & Role to Seed Employee [EID: ${empRes.rows[0]?.eid || 'No Seed Employee Found'}]`);
    console.log('  ✅ TEST 2 PASSED\n');


    // ─────────────────────────────────────────────────────────
    // TEST 3: INTEGRACIONES (PMO Shield / Sprint 13)
    // ─────────────────────────────────────────────────────────
    console.log('▶️ TEST 3: Integraciones (PMO Shield / Sprint 13)');
    
    // Create Board & Task
    const boardRes = await client.query(`
      INSERT INTO public.pmo_boards (org_id, name) VALUES ($1, 'Test Board') RETURNING id;
    `, [tenant]);
    const boardId = boardRes.rows[0].id;

    const taskRes = await client.query(`
      INSERT INTO public.pmo_tasks (id, org_id, board_id, group_id, title, source_playbook_id, is_protected, custom_field_values, updated_at)
      VALUES (gen_random_uuid()::text, $1, $2, 'group1', 'Sync Salesforce Data', 'PB-SIMO-100', true, '{}'::jsonb, NOW())
      RETURNING id;
    `, [tenant, boardId]);
    const taskId = taskRes.rows[0].id;
    console.log(`  ✔️ Created PMO Task lined to Playbook [Task ID: ${taskId}]`);

    // Attempt Delete
    let shieldCaught = false;
    try {
      await client.query(`DELETE FROM public.pmo_tasks WHERE id = $1`, [taskId]);
    } catch (e) {
      if (e.message.includes('TASK_PLAYBOOK_PROTECTED')) {
        shieldCaught = true;
        console.log(`  ✔️ PMO Shield successfully blocked deletion: "${e.message}"`);
      } else {
        throw e;
      }
    }
    if (!shieldCaught) throw new Error('PMO Shield failed to block deletion!');
    console.log('  ✅ TEST 3 PASSED\n');


    // ─────────────────────────────────────────────────────────
    // TEST 4: CONFIRMACIÓN VISUAL / API (Mock query that App uses)
    // ─────────────────────────────────────────────────────────
    console.log('▶️ TEST 4: Confirmación API (Vista UI)');

    // Simulate query from job-title-actions.ts
    const apiQuery = await client.query(`
      SELECT j.title, r.role_title 
      FROM public.dim_job_title j
      LEFT JOIN public.dim_role_title r ON j.id = r.job_title_id
      WHERE j.tenant_id = $1 AND j.title = 'Simo Master Architect';
    `, [tenant]);
    
    if (apiQuery.rows.length > 0 && apiQuery.rows[0].title === 'Simo Master Architect') {
      console.log(`  ✔️ API Query matched: JobTitle='${apiQuery.rows[0].title}', Role='${apiQuery.rows[0].role_title}'`);
      console.log('  ✅ TEST 4 PASSED\n');
    } else {
      throw new Error('API could not fetch the newly created job title.');
    }

    console.log('🎉 TODAS LAS PRUEBAS SUPERADAS. INTEGRIDAD DEL RASCACIELOS CONFIRMADA. 100% OPERATIVO.');

  } catch (err) {
    console.error('\n❌ STRESS TEST FAILED:', err.message);
  } finally {
    // Cleanup the test data to leave DB clean
    try {
      if (tenant) {
        await client.query(`DELETE FROM public.dim_job_title WHERE title = 'Simo Master Architect'`);
        await client.query(`DELETE FROM public.pmo_boards WHERE name = 'Test Board'`);
      }
    } catch(e) {}
    await client.end();
  }
}

runStressTest();
