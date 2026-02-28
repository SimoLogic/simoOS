const fs = require('fs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const SQL_FILE = './supabase/migrations/00012_demo_seed_dml.sql';

// Helper for escaping SQL strings
const escapeSql = (str) => {
    if (str === null || str === undefined) return 'NULL';
    return "'" + str.replace(/'/g, "''") + "'";
};

let sql = `
-- ─────────────────────────────────────────────────────────────────────────────
-- HOPSI ENTERPRISE OS (H-OS) · DATABASE DEMO SEED
-- 00012_demo_seed_dml.sql
-- Description: Injects demo data (Tenants, Geographies, Branches, Employees)
-- ─────────────────────────────────────────────────────────────────────────────

-- Disable triggers to avoid cascading timestamps if necessary (optional, but let's just insert)

-- 1. DELETE OLD DUMMY TENANTS AND SET UP MAIN 3 TENANTS
DELETE FROM public.dim_tenant WHERE tcode NOT IN ('TNT-001', 'TNT-002', 'TNT-003');

INSERT INTO public.dim_tenant (tcode, legal_name, dba_name, reporting_currency) 
VALUES ('TNT-001', 'HOMESI LLC', 'HOMESI', 'USD')
ON CONFLICT (tcode) DO UPDATE SET legal_name = 'HOMESI LLC', dba_name = 'HOMESI';

INSERT INTO public.dim_tenant (tcode, legal_name, dba_name, reporting_currency) 
VALUES ('TNT-002', 'Birchwood Capital', 'Birchwood', 'USD')
ON CONFLICT (tcode) DO NOTHING;

INSERT INTO public.dim_tenant (tcode, legal_name, dba_name, reporting_currency) 
VALUES ('TNT-003', 'AMP Mortgage', 'AMP', 'USD')
ON CONFLICT (tcode) DO NOTHING;

-- 2. GEOGRAPHIES
`;

const continents = {
    Americas: uuidv4(),
    Europe: uuidv4()
};

for (const [name, id] of Object.entries(continents)) {
    sql += `INSERT INTO public.dim_continent (id, name) VALUES ('${id}', '${name}') ON CONFLICT (name) DO NOTHING;\n`;
}

const countries = {
    USA: { id: uuidv4(), continent_id: continents.Americas, currency_code: 'USD' },
    Colombia: { id: uuidv4(), continent_id: continents.Americas, currency_code: 'COP' },
    Peru: { id: uuidv4(), continent_id: continents.Americas, currency_code: 'PEN' },
    Spain: { id: uuidv4(), continent_id: continents.Europe, currency_code: 'EUR' }
};

for (const [name, c] of Object.entries(countries)) {
    sql += `INSERT INTO public.dim_country (id, continent_id, name, currency_code) VALUES ('${c.id}', '${c.continent_id}', '${name}', '${c.currency_code}') ON CONFLICT (name) DO NOTHING;\n`;
}

const cities = {
    Miami: { id: uuidv4(), country_id: countries.USA.id },
    NewYork: { id: uuidv4(), country_id: countries.USA.id },
    Bogota: { id: uuidv4(), country_id: countries.Colombia.id },
    Medellin: { id: uuidv4(), country_id: countries.Colombia.id },
    Barranquilla: { id: uuidv4(), country_id: countries.Colombia.id },
    Lima: { id: uuidv4(), country_id: countries.Peru.id },
    Madrid: { id: uuidv4(), country_id: countries.Spain.id }
};

sql += `\n-- Insert Cities (Assuming no duplicates by country, we can generate safe inserts)\n`;
for (const [name, c] of Object.entries(cities)) {
    sql += `INSERT INTO public.dim_city (id, country_id, name) VALUES ('${c.id}', '${c.country_id}', '${name}') ON CONFLICT DO NOTHING;\n`;
}

// 3. BRANCHES
sql += `\n-- 3. BRANCHES\n`;
const homesiBranches = [];
for (let i = 0; i < 15; i++) {
    const code = 700 + i; // 700 to 714
    const id = uuidv4();
    homesiBranches.push({ id, code, name: `Branch ${code}` });
    sql += `INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('${id}', 'TNT-001', '${code}', 'Branch ${code}', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;\n`;
}

const birchwoodBranchId = uuidv4();
sql += `INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('${birchwoodBranchId}', 'TNT-002', '201', 'Birchwood Main', '456 Birch Ave') ON CONFLICT (tenant_id, branch_code) DO NOTHING;\n`;

const ampBranchId = uuidv4();
sql += `INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('${ampBranchId}', 'TNT-003', '301', 'AMP Operations', '789 AMP St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;\n`;

// Helper data for employees
const firstNamesLatino = ['Juan', 'Carlos', 'Luis', 'Maria', 'Ana', 'Laura', 'Pedro', 'Sofia', 'Camila', 'Diego', 'Mateo', 'Valentina', 'Isabella', 'Daniel', 'Alejandro', 'Andres', 'Jorge', 'Paula', 'Catalina', 'Felipe'];
const lastNamesLatino = ['Perez', 'Gomez', 'Rodriguez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Romero', 'Suarez', 'Torres', 'Garcia', 'Rojas', 'Diaz', 'Cruz', 'Morales', 'Ortiz', 'Guzman', 'Vargas', 'Rios', 'Reyes'];
const firstNamesUS = ['John', 'Michael', 'Emily', 'Sarah', 'Jessica', 'David', 'James', 'Robert', 'William', 'Ashley', 'Amanda', 'Matthew', 'Christopher', 'Joseph', 'Jennifer', 'Elizabeth', 'Daniel', 'Brian', 'Kevin', 'Lauren'];
const lastNamesUS = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const employeesBuffer = [];
let eidCounter = 1;

const getRandomName = (isUS) => {
    if (isUS) {
        return {
            first: firstNamesUS[Math.floor(Math.random() * firstNamesUS.length)],
            last: lastNamesUS[Math.floor(Math.random() * lastNamesUS.length)],
            last2: 'Smith',
        };
    } else {
        return {
            first: firstNamesLatino[Math.floor(Math.random() * firstNamesLatino.length)],
            last: lastNamesLatino[Math.floor(Math.random() * lastNamesLatino.length)],
            last2: lastNamesLatino[Math.floor(Math.random() * lastNamesLatino.length)],
        };
    }
};

const createEmployee = ({ tenant, isUS, countryObj, cityObj, role, branchName, managerEid }) => {
    const eid = `EID-${String(eidCounter++).padStart(4, '0')}`;
    const name = getRandomName(isUS);
    return {
        eid,
        tenant_id: tenant,
        numero_identificacion: Math.floor(Math.random() * 900000000) + 100000000 + "",
        tipo_documento_id: isUS ? 'SSN' : 'CC',
        primer_nombre: name.first,
        primer_apellido: name.last,
        segundo_apellido: name.last2,
        fecha_nacimiento: '1990-01-01',
        genero: Math.random() > 0.5 ? 'M' : 'F',
        email_personal: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@personal.com`,
        municipio_dane: '00000',
        direccion_residencia: '123 Fake St',
        foto_url: `https://i.pravatar.cc/150?u=${eid}`,
        status: 'Active',
        fecha_inicio: '2024-01-01',
        tipo_contrato: isUS ? 'W2' : 'Indefinido',
        tipo_salario: 'Fijo',
        salario_base: isUS ? 5000 : (countryObj.currency_code === 'PEN' ? 3000 : 4000000),
        area: 'Operations',
        sub_area: 'Sales',
        centro_costo: 'CC01',
        job_title: role,
        branch: branchName || '',
        continent_id: countryObj.continent_id,
        country_id: countryObj.id,
        city_id: cityObj.id,
        salary_currency: countryObj.currency_code,
        direct_leader_id: managerEid || null
    };
};

// 4. GENERATE EMPLOYEES
// HOMESI: 80 Ops (55 CO, 5 PE, 20 US)
const opsCO = []; const opsPE = []; const opsUS = [];

// Divide by branches (15 branches)
// Let's create Branch Managers first (15 BMs, one per branch, mixture of US/CO)
for (let i = 0; i < 15; i++) {
    const isUS = i < 5; // 5 US BMs, 10 CO BMs
    const cObj = isUS ? countries.USA : countries.Colombia;
    const cityObj = isUS ? cities.Miami : cities.Bogota;
    const emp = createEmployee({ tenant: 'TNT-001', isUS, countryObj: cObj, cityObj, role: 'Branch Manager', branchName: homesiBranches[i].name, managerEid: null });
    if (isUS) opsUS.push(emp); else opsCO.push(emp);
    employeesBuffer.push(emp);
}

// Now LOs, processors, sales agents, LOAs assigned to these branches
const distributeOps = (count, cObj, cityObj, isUS, arrayToPush) => {
    for (let i = 0; i < count; i++) {
        // Pick a random branch
        const branchIndex = Math.floor(Math.random() * 15);
        const branchName = homesiBranches[branchIndex].name;
        // Find the BM of this branch
        const bm = employeesBuffer.find(e => e.branch === branchName && e.job_title === 'Branch Manager');

        let role = '';
        const r = Math.random();
        if (r < 0.3) role = 'Loan Officer';
        else if (r < 0.6) role = 'Processor';
        else if (r < 0.8) role = 'Sales Agent';
        else role = 'Loan Officer Assistant';

        // Hierarchy rule: LOA reports to LO in the same branch. If no LO, reports to BM. Others report to BM.
        let managerId = bm ? bm.eid : null;
        if (role === 'Loan Officer Assistant') {
            const lo = employeesBuffer.find(e => e.branch === branchName && e.job_title === 'Loan Officer');
            if (lo) managerId = lo.eid;
        }

        const emp = createEmployee({ tenant: 'TNT-001', isUS, countryObj: cObj, cityObj, role, branchName, managerEid: managerId });
        arrayToPush.push(emp);
        employeesBuffer.push(emp);
    }
};

// Remaining Ops to reach: 55 CO, 5 PE, 20 US
// We already have 10 CO BMs and 5 US BMs.
// Missing: 45 CO, 5 PE, 15 US.
distributeOps(45, countries.Colombia, cities.Medellin, false, opsCO);
distributeOps(15, countries.USA, cities.NewYork, true, opsUS);
distributeOps(5, countries.Peru, cities.Lima, false, opsPE);

// HOMESI: 20 Admins
// CFO -> Finance Mgr / Acc Mgr -> Assistants
const generateAdmins = () => {
    // 1 CFO
    const cfo = createEmployee({ tenant: 'TNT-001', isUS: true, countryObj: countries.USA, cityObj: cities.Miami, role: 'Chief Financial Officer', branchName: 'HQ', managerEid: null });
    employeesBuffer.push(cfo);
    // 2 Managers reporting to CFO
    const finMgr = createEmployee({ tenant: 'TNT-001', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'Finance Manager', branchName: 'HQ', managerEid: cfo.eid });
    const accMgr = createEmployee({ tenant: 'TNT-001', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'Accounting Manager', branchName: 'HQ', managerEid: cfo.eid });
    employeesBuffer.push(finMgr, accMgr);

    // VP HR -> HR Mgr -> HR Staff
    const vpHR = createEmployee({ tenant: 'TNT-001', isUS: true, countryObj: countries.USA, cityObj: cities.Miami, role: 'VP of HR', branchName: 'HQ', managerEid: null });
    const hrMgr = createEmployee({ tenant: 'TNT-001', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'HR Manager', branchName: 'HQ', managerEid: vpHR.eid });
    employeesBuffer.push(vpHR, hrMgr);

    // Mkt Dir -> Mkt Mgr
    const mktDir = createEmployee({ tenant: 'TNT-001', isUS: true, countryObj: countries.USA, cityObj: cities.NewYork, role: 'Marketing Director', branchName: 'HQ', managerEid: null });
    employeesBuffer.push(mktDir);

    // The rest (14 admins)
    const adminRoles = [
        { role: 'Financial Analyst', mgr: finMgr.eid },
        { role: 'Accounting Assistant', mgr: accMgr.eid },
        { role: 'Business Plan Admin', mgr: cfo.eid },
        { role: 'HR Generalist', mgr: hrMgr.eid },
        { role: 'Marketing Specialist', mgr: mktDir.eid }
    ];

    for (let i = 0; i < 14; i++) {
        const item = adminRoles[i % adminRoles.length];
        const emp = createEmployee({ tenant: 'TNT-001', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: item.role, branchName: 'HQ', managerEid: item.mgr });
        employeesBuffer.push(emp);
    }
};
generateAdmins();

// Birchwood (15): All CO, Admins.
// Let's create a CEO, then managers, then assistants
const bwCeo = createEmployee({ tenant: 'TNT-002', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'CEO', branchName: 'Birchwood Main', managerEid: null });
employeesBuffer.push(bwCeo);
const bwMgr = createEmployee({ tenant: 'TNT-002', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'Operations Manager', branchName: 'Birchwood Main', managerEid: bwCeo.eid });
employeesBuffer.push(bwMgr);
for (let i = 0; i < 13; i++) {
    const emp = createEmployee({ tenant: 'TNT-002', isUS: false, countryObj: countries.Colombia, cityObj: cities.Bogota, role: 'Administrative Assistant', branchName: 'Birchwood Main', managerEid: bwMgr.eid });
    employeesBuffer.push(emp);
}

// AMP (4): All CO, LOA.
// 1 BM, 3 LOAs
const ampBM = createEmployee({ tenant: 'TNT-003', isUS: false, countryObj: countries.Colombia, cityObj: cities.Medellin, role: 'Branch Manager', branchName: 'AMP Operations', managerEid: null });
employeesBuffer.push(ampBM);
for (let i = 0; i < 3; i++) {
    const emp = createEmployee({ tenant: 'TNT-003', isUS: false, countryObj: countries.Colombia, cityObj: cities.Medellin, role: 'Loan Officer Assistant', branchName: 'AMP Operations', managerEid: ampBM.eid });
    employeesBuffer.push(emp);
}


// Now insert employees
sql += `\n-- 4. EMPLOYEES\n`;
// We must insert in order to respect foreign keys (managers first). 
// Since some might reference later ones, we will first insert WITHOUT direct_leader_id, then UPDATE direct_leader_id.

for (const e of employeesBuffer) {
    sql += `INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        '${e.eid}', '${e.tenant_id}', '${e.numero_identificacion}', '${e.tipo_documento_id}', ${escapeSql(e.primer_nombre)}, ${escapeSql(e.primer_apellido)},
        ${escapeSql(e.segundo_apellido)}, '${e.fecha_nacimiento}', '${e.genero}', '${e.email_personal}', '${e.municipio_dane}', '${e.direccion_residencia}',
        '${e.status}', '${e.fecha_inicio}', '${e.tipo_contrato}', '${e.tipo_salario}', ${e.salario_base},
        '${e.area}', '${e.sub_area}', '${e.centro_costo}', '${e.job_title}', '${e.branch}', '${e.foto_url}',
        ${e.continent_id ? "'" + e.continent_id + "'" : 'NULL'}, ${e.country_id ? "'" + e.country_id + "'" : 'NULL'}, ${e.city_id ? "'" + e.city_id + "'" : 'NULL'}, '${e.salary_currency}'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;\n`;
}

sql += `\n-- 5. EMPLOYEE HIERARCHY UPDATES\n`;
for (const e of employeesBuffer) {
    if (e.direct_leader_id) {
        sql += `UPDATE public.dim_employee SET direct_leader_id = '${e.direct_leader_id}' WHERE eid = '${e.eid}';\n`;
    }
}

sql += `\n-- 6. PLAYBOOKS\n`;
// Realtor Outreach & Email Marketing Camp for HOMESI (TNT-001)

const pb1Node = [
    { id: "step-1", title: "Daily Realtor Call", description: "Call at least 10 realtors.", frequency: "Daily", target_count: 10, is_mandatory: true }
];
const pb2Node = [
    { id: "step-1", title: "Email Campaign Review", description: "Check CRM for open rates.", frequency: "Daily", target_count: 1, is_mandatory: true }
];

sql += `INSERT INTO public.growthify_playbooks (id, tenant_id, name, category, nodes) VALUES 
('PB-REALTOR-001', 'TNT-001', 'Realtor Outreach', 'commercial', '${JSON.stringify(pb1Node)}')
ON CONFLICT (id) DO NOTHING;\n`;

sql += `INSERT INTO public.growthify_playbooks (id, tenant_id, name, category, nodes) VALUES 
('PB-EMAIL-001', 'TNT-001', 'Email Marketing Camp', 'commercial', '${JSON.stringify(pb2Node)}')
ON CONFLICT (id) DO NOTHING;\n`;

fs.writeFileSync(SQL_FILE, sql, 'utf8');
console.log('Seed SQL file generated successfully at', SQL_FILE);
