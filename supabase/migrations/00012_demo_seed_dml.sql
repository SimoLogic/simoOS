
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
INSERT INTO public.dim_continent (id, name) VALUES ('36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'Americas') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dim_continent (id, name) VALUES ('6a8a8139-8a4f-4ce5-a340-9b24076498e7', 'Europe') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dim_country (id, continent_id, name, currency_code) VALUES ('704c063e-8eaa-4889-979d-d0bee5da55af', '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'USA', 'USD') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dim_country (id, continent_id, name, currency_code) VALUES ('b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'Colombia', 'COP') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dim_country (id, continent_id, name, currency_code) VALUES ('e05192f6-1862-42e0-a4e6-fea2bb598d3d', '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'Peru', 'PEN') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dim_country (id, continent_id, name, currency_code) VALUES ('9ab51e9f-987c-4471-b746-c7718d8c70c2', '6a8a8139-8a4f-4ce5-a340-9b24076498e7', 'Spain', 'EUR') ON CONFLICT (name) DO NOTHING;

-- Insert Cities (Assuming no duplicates by country, we can generate safe inserts)
INSERT INTO public.dim_city (id, country_id, name) VALUES ('6d339d5f-7c10-48b4-9553-3a40d5e1f46c', '704c063e-8eaa-4889-979d-d0bee5da55af', 'Miami') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', '704c063e-8eaa-4889-979d-d0bee5da55af', 'NewYork') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('80a41608-f936-46f9-887a-593c1dc994ea', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'Bogota') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('e1106313-34d8-4a89-93c4-6c8bf2aae960', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'Medellin') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('c9f0d26f-971c-4a35-a636-3fa82b316ddb', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'Barranquilla') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'Lima') ON CONFLICT DO NOTHING;
INSERT INTO public.dim_city (id, country_id, name) VALUES ('63a9eeb0-c8f0-4257-a22e-55dc0ce8d065', '9ab51e9f-987c-4471-b746-c7718d8c70c2', 'Madrid') ON CONFLICT DO NOTHING;

-- 3. BRANCHES
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('b0cc48bc-34bd-4fe8-a758-1674182ebd8b', 'TNT-001', '700', 'Branch 700', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('638d8034-adb5-4fab-969f-ead722f084f3', 'TNT-001', '701', 'Branch 701', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('69e22a7d-a26f-4c9d-92b9-bb233b92d9e8', 'TNT-001', '702', 'Branch 702', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('d6d9c2aa-dd47-4dec-b06d-d7186fcd180d', 'TNT-001', '703', 'Branch 703', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('af26c4e4-6d99-45a0-8ed7-d1517092204d', 'TNT-001', '704', 'Branch 704', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('61ffa403-02a3-4dc5-900b-01f8fa6d2dc1', 'TNT-001', '705', 'Branch 705', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('38fcb49f-dc06-4717-8ed6-745f7023af0c', 'TNT-001', '706', 'Branch 706', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('25a1161d-de67-44d3-87be-f64d82195589', 'TNT-001', '707', 'Branch 707', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('58c200e1-05a4-4fdc-ab6b-528f39321cca', 'TNT-001', '708', 'Branch 708', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('b14a5713-78be-439a-a3a9-0d8b94cda8ef', 'TNT-001', '709', 'Branch 709', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('2e5e8b83-c47c-44ce-844c-4821039a4f7a', 'TNT-001', '710', 'Branch 710', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('c51e86e8-6cee-4f75-8577-2e84d1bbce81', 'TNT-001', '711', 'Branch 711', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('08dea564-93d1-4f16-8adc-70c1dc2f6b00', 'TNT-001', '712', 'Branch 712', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('81d2c825-6aa4-4b24-bdfc-09582f17ae10', 'TNT-001', '713', 'Branch 713', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('2b236e5a-1a2f-4c66-ac4e-ccbb04450c77', 'TNT-001', '714', 'Branch 714', '123 Fake St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('cf4f7983-ea6c-49e5-b7b0-40c58f35dc40', 'TNT-002', '201', 'Birchwood Main', '456 Birch Ave') ON CONFLICT (tenant_id, branch_code) DO NOTHING;
INSERT INTO public.dim_branch (id, tenant_id, branch_code, branch_name, office_address) VALUES ('4f64bc32-3701-47f2-8a65-06b4bb38e3ac', 'TNT-003', '301', 'AMP Operations', '789 AMP St') ON CONFLICT (tenant_id, branch_code) DO NOTHING;

-- 4. EMPLOYEES
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0001', 'TNT-001', '662270103', 'SSN', 'Michael', 'Anderson',
        'Smith', '1990-01-01', 'M', 'michael.anderson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 700', 'https://i.pravatar.cc/150?u=EID-0001',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0002', 'TNT-001', '897090119', 'SSN', 'John', 'Hernandez',
        'Smith', '1990-01-01', 'M', 'john.hernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 701', 'https://i.pravatar.cc/150?u=EID-0002',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0003', 'TNT-001', '800959002', 'SSN', 'John', 'Wilson',
        'Smith', '1990-01-01', 'M', 'john.wilson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 702', 'https://i.pravatar.cc/150?u=EID-0003',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0004', 'TNT-001', '631270445', 'SSN', 'Michael', 'Jackson',
        'Smith', '1990-01-01', 'F', 'michael.jackson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0004',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0005', 'TNT-001', '479530265', 'SSN', 'Sarah', 'Jones',
        'Smith', '1990-01-01', 'M', 'sarah.jones@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0005',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0006', 'TNT-001', '534407216', 'CC', 'Maria', 'Rios',
        'Fernandez', '1990-01-01', 'F', 'maria.rios@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 705', 'https://i.pravatar.cc/150?u=EID-0006',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0007', 'TNT-001', '738277800', 'CC', 'Paula', 'Torres',
        'Garcia', '1990-01-01', 'M', 'paula.torres@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 706', 'https://i.pravatar.cc/150?u=EID-0007',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0008', 'TNT-001', '276961562', 'CC', 'Paula', 'Ortiz',
        'Morales', '1990-01-01', 'F', 'paula.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 707', 'https://i.pravatar.cc/150?u=EID-0008',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0009', 'TNT-001', '211077870', 'CC', 'Laura', 'Sanchez',
        'Garcia', '1990-01-01', 'M', 'laura.sanchez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0009',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0010', 'TNT-001', '946524487', 'CC', 'Daniel', 'Lopez',
        'Vargas', '1990-01-01', 'F', 'daniel.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 709', 'https://i.pravatar.cc/150?u=EID-0010',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0011', 'TNT-001', '542977138', 'CC', 'Luis', 'Vargas',
        'Morales', '1990-01-01', 'F', 'luis.vargas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0011',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0012', 'TNT-001', '124058026', 'CC', 'Valentina', 'Diaz',
        'Cruz', '1990-01-01', 'F', 'valentina.diaz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 711', 'https://i.pravatar.cc/150?u=EID-0012',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0013', 'TNT-001', '173321451', 'CC', 'Carlos', 'Garcia',
        'Vargas', '1990-01-01', 'F', 'carlos.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 712', 'https://i.pravatar.cc/150?u=EID-0013',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0014', 'TNT-001', '150747545', 'CC', 'Camila', 'Guzman',
        'Morales', '1990-01-01', 'F', 'camila.guzman@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 713', 'https://i.pravatar.cc/150?u=EID-0014',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0015', 'TNT-001', '400746645', 'CC', 'Alejandro', 'Garcia',
        'Fernandez', '1990-01-01', 'M', 'alejandro.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'Branch 714', 'https://i.pravatar.cc/150?u=EID-0015',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0016', 'TNT-001', '498293314', 'CC', 'Laura', 'Gomez',
        'Diaz', '1990-01-01', 'F', 'laura.gomez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0016',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0017', 'TNT-001', '271996110', 'CC', 'Alejandro', 'Romero',
        'Diaz', '1990-01-01', 'F', 'alejandro.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0017',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0018', 'TNT-001', '740619360', 'CC', 'Sofia', 'Ortiz',
        'Martinez', '1990-01-01', 'M', 'sofia.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 711', 'https://i.pravatar.cc/150?u=EID-0018',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0019', 'TNT-001', '568283150', 'CC', 'Felipe', 'Rojas',
        'Martinez', '1990-01-01', 'F', 'felipe.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0019',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0020', 'TNT-001', '880068778', 'CC', 'Laura', 'Diaz',
        'Morales', '1990-01-01', 'M', 'laura.diaz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0020',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0021', 'TNT-001', '244084033', 'CC', 'Carlos', 'Garcia',
        'Fernandez', '1990-01-01', 'M', 'carlos.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 701', 'https://i.pravatar.cc/150?u=EID-0021',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0022', 'TNT-001', '332777108', 'CC', 'Jorge', 'Romero',
        'Guzman', '1990-01-01', 'F', 'jorge.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 702', 'https://i.pravatar.cc/150?u=EID-0022',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0023', 'TNT-001', '904138149', 'CC', 'Alejandro', 'Fernandez',
        'Perez', '1990-01-01', 'F', 'alejandro.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 706', 'https://i.pravatar.cc/150?u=EID-0023',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0024', 'TNT-001', '491731571', 'CC', 'Alejandro', 'Fernandez',
        'Morales', '1990-01-01', 'F', 'alejandro.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 712', 'https://i.pravatar.cc/150?u=EID-0024',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0025', 'TNT-001', '976315130', 'CC', 'Laura', 'Guzman',
        'Rodriguez', '1990-01-01', 'F', 'laura.guzman@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 701', 'https://i.pravatar.cc/150?u=EID-0025',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0026', 'TNT-001', '896325554', 'CC', 'Jorge', 'Fernandez',
        'Rios', '1990-01-01', 'M', 'jorge.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0026',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0027', 'TNT-001', '123637732', 'CC', 'Luis', 'Rojas',
        'Lopez', '1990-01-01', 'M', 'luis.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0027',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0028', 'TNT-001', '965726014', 'CC', 'Ana', 'Perez',
        'Morales', '1990-01-01', 'F', 'ana.perez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0028',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0029', 'TNT-001', '137393533', 'CC', 'Pedro', 'Ortiz',
        'Fernandez', '1990-01-01', 'F', 'pedro.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0029',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0030', 'TNT-001', '261309488', 'CC', 'Camila', 'Suarez',
        'Lopez', '1990-01-01', 'F', 'camila.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0030',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0031', 'TNT-001', '839274778', 'CC', 'Mateo', 'Morales',
        'Lopez', '1990-01-01', 'F', 'mateo.morales@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0031',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0032', 'TNT-001', '747711630', 'CC', 'Daniel', 'Garcia',
        'Guzman', '1990-01-01', 'M', 'daniel.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0032',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0033', 'TNT-001', '537552284', 'CC', 'Mateo', 'Suarez',
        'Reyes', '1990-01-01', 'M', 'mateo.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 702', 'https://i.pravatar.cc/150?u=EID-0033',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0034', 'TNT-001', '300320257', 'CC', 'Laura', 'Torres',
        'Romero', '1990-01-01', 'M', 'laura.torres@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0034',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0035', 'TNT-001', '177716658', 'CC', 'Camila', 'Reyes',
        'Fernandez', '1990-01-01', 'M', 'camila.reyes@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 713', 'https://i.pravatar.cc/150?u=EID-0035',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0036', 'TNT-001', '716828965', 'CC', 'Felipe', 'Suarez',
        'Suarez', '1990-01-01', 'F', 'felipe.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0036',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0037', 'TNT-001', '739832444', 'CC', 'Mateo', 'Cruz',
        'Rojas', '1990-01-01', 'M', 'mateo.cruz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0037',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0038', 'TNT-001', '990238095', 'CC', 'Catalina', 'Rojas',
        'Rodriguez', '1990-01-01', 'M', 'catalina.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 701', 'https://i.pravatar.cc/150?u=EID-0038',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0039', 'TNT-001', '212344695', 'CC', 'Pedro', 'Sanchez',
        'Rodriguez', '1990-01-01', 'M', 'pedro.sanchez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 709', 'https://i.pravatar.cc/150?u=EID-0039',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0040', 'TNT-001', '613531820', 'CC', 'Laura', 'Lopez',
        'Guzman', '1990-01-01', 'F', 'laura.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0040',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0041', 'TNT-001', '855551481', 'CC', 'Felipe', 'Ortiz',
        'Rodriguez', '1990-01-01', 'M', 'felipe.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0041',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0042', 'TNT-001', '261190152', 'CC', 'Mateo', 'Lopez',
        'Torres', '1990-01-01', 'F', 'mateo.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0042',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0043', 'TNT-001', '457453278', 'CC', 'Maria', 'Fernandez',
        'Martinez', '1990-01-01', 'F', 'maria.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0043',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0044', 'TNT-001', '698199590', 'CC', 'Sofia', 'Garcia',
        'Romero', '1990-01-01', 'F', 'sofia.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0044',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0045', 'TNT-001', '576175875', 'CC', 'Luis', 'Romero',
        'Lopez', '1990-01-01', 'F', 'luis.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0045',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0046', 'TNT-001', '165467945', 'CC', 'Catalina', 'Fernandez',
        'Martinez', '1990-01-01', 'F', 'catalina.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 713', 'https://i.pravatar.cc/150?u=EID-0046',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0047', 'TNT-001', '685521765', 'CC', 'Sofia', 'Suarez',
        'Cruz', '1990-01-01', 'M', 'sofia.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 709', 'https://i.pravatar.cc/150?u=EID-0047',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0048', 'TNT-001', '676384358', 'CC', 'Maria', 'Torres',
        'Martinez', '1990-01-01', 'M', 'maria.torres@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0048',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0049', 'TNT-001', '998578397', 'CC', 'Isabella', 'Guzman',
        'Rojas', '1990-01-01', 'F', 'isabella.guzman@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0049',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0050', 'TNT-001', '827821607', 'CC', 'Isabella', 'Garcia',
        'Romero', '1990-01-01', 'M', 'isabella.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 703', 'https://i.pravatar.cc/150?u=EID-0050',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0051', 'TNT-001', '432058569', 'CC', 'Jorge', 'Rodriguez',
        'Gomez', '1990-01-01', 'F', 'jorge.rodriguez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 713', 'https://i.pravatar.cc/150?u=EID-0051',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0052', 'TNT-001', '966564630', 'CC', 'Maria', 'Fernandez',
        'Rodriguez', '1990-01-01', 'F', 'maria.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 714', 'https://i.pravatar.cc/150?u=EID-0052',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0053', 'TNT-001', '879643575', 'CC', 'Andres', 'Perez',
        'Perez', '1990-01-01', 'F', 'andres.perez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 711', 'https://i.pravatar.cc/150?u=EID-0053',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0054', 'TNT-001', '490899717', 'CC', 'Felipe', 'Guzman',
        'Guzman', '1990-01-01', 'M', 'felipe.guzman@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 707', 'https://i.pravatar.cc/150?u=EID-0054',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0055', 'TNT-001', '126393690', 'CC', 'Laura', 'Morales',
        'Morales', '1990-01-01', 'F', 'laura.morales@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 700', 'https://i.pravatar.cc/150?u=EID-0055',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0056', 'TNT-001', '578158245', 'CC', 'Andres', 'Martinez',
        'Gomez', '1990-01-01', 'M', 'andres.martinez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 705', 'https://i.pravatar.cc/150?u=EID-0056',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0057', 'TNT-001', '596489652', 'CC', 'Luis', 'Gomez',
        'Romero', '1990-01-01', 'F', 'luis.gomez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 709', 'https://i.pravatar.cc/150?u=EID-0057',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0058', 'TNT-001', '726611947', 'CC', 'Catalina', 'Sanchez',
        'Martinez', '1990-01-01', 'F', 'catalina.sanchez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0058',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0059', 'TNT-001', '379974933', 'CC', 'Sofia', 'Rojas',
        'Romero', '1990-01-01', 'F', 'sofia.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 700', 'https://i.pravatar.cc/150?u=EID-0059',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0060', 'TNT-001', '328321976', 'CC', 'Alejandro', 'Suarez',
        'Fernandez', '1990-01-01', 'F', 'alejandro.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 705', 'https://i.pravatar.cc/150?u=EID-0060',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0061', 'TNT-001', '710186373', 'SSN', 'David', 'Moore',
        'Smith', '1990-01-01', 'F', 'david.moore@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0061',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0062', 'TNT-001', '541189188', 'SSN', 'Ashley', 'Garcia',
        'Smith', '1990-01-01', 'M', 'ashley.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 713', 'https://i.pravatar.cc/150?u=EID-0062',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0063', 'TNT-001', '911165324', 'SSN', 'Amanda', 'Gonzalez',
        'Smith', '1990-01-01', 'M', 'amanda.gonzalez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 707', 'https://i.pravatar.cc/150?u=EID-0063',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0064', 'TNT-001', '407843842', 'SSN', 'Brian', 'Williams',
        'Smith', '1990-01-01', 'M', 'brian.williams@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 714', 'https://i.pravatar.cc/150?u=EID-0064',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0065', 'TNT-001', '332779074', 'SSN', 'Michael', 'Davis',
        'Smith', '1990-01-01', 'M', 'michael.davis@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0065',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0066', 'TNT-001', '882121854', 'SSN', 'Joseph', 'Martinez',
        'Smith', '1990-01-01', 'M', 'joseph.martinez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 705', 'https://i.pravatar.cc/150?u=EID-0066',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0067', 'TNT-001', '543379561', 'SSN', 'Lauren', 'Hernandez',
        'Smith', '1990-01-01', 'F', 'lauren.hernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0067',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0068', 'TNT-001', '805118734', 'SSN', 'Matthew', 'Anderson',
        'Smith', '1990-01-01', 'F', 'matthew.anderson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0068',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0069', 'TNT-001', '383657757', 'SSN', 'Emily', 'Gonzalez',
        'Smith', '1990-01-01', 'F', 'emily.gonzalez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0069',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0070', 'TNT-001', '614189577', 'SSN', 'Sarah', 'Hernandez',
        'Smith', '1990-01-01', 'M', 'sarah.hernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 706', 'https://i.pravatar.cc/150?u=EID-0070',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0071', 'TNT-001', '587224207', 'SSN', 'Kevin', 'Jackson',
        'Smith', '1990-01-01', 'M', 'kevin.jackson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 706', 'https://i.pravatar.cc/150?u=EID-0071',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0072', 'TNT-001', '417669050', 'SSN', 'Jennifer', 'Thomas',
        'Smith', '1990-01-01', 'M', 'jennifer.thomas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 708', 'https://i.pravatar.cc/150?u=EID-0072',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0073', 'TNT-001', '628763420', 'SSN', 'Ashley', 'Gonzalez',
        'Smith', '1990-01-01', 'M', 'ashley.gonzalez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0073',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0074', 'TNT-001', '247994813', 'SSN', 'Lauren', 'Martinez',
        'Smith', '1990-01-01', 'M', 'lauren.martinez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Processor', 'Branch 704', 'https://i.pravatar.cc/150?u=EID-0074',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0075', 'TNT-001', '799876053', 'SSN', 'Ashley', 'Johnson',
        'Smith', '1990-01-01', 'F', 'ashley.johnson@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0075',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0076', 'TNT-001', '175890987', 'CC', 'Maria', 'Perez',
        'Romero', '1990-01-01', 'M', 'maria.perez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 3000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 705', 'https://i.pravatar.cc/150?u=EID-0076',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'PEN'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0077', 'TNT-001', '229486900', 'CC', 'Alejandro', 'Rojas',
        'Guzman', '1990-01-01', 'M', 'alejandro.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 3000,
        'Operations', 'Sales', 'CC01', 'Sales Agent', 'Branch 709', 'https://i.pravatar.cc/150?u=EID-0077',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'PEN'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0078', 'TNT-001', '380941288', 'CC', 'Daniel', 'Gomez',
        'Guzman', '1990-01-01', 'M', 'daniel.gomez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 3000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 706', 'https://i.pravatar.cc/150?u=EID-0078',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'PEN'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0079', 'TNT-001', '167145870', 'CC', 'Andres', 'Reyes',
        'Fernandez', '1990-01-01', 'F', 'andres.reyes@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 3000,
        'Operations', 'Sales', 'CC01', 'Loan Officer', 'Branch 701', 'https://i.pravatar.cc/150?u=EID-0079',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'PEN'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0080', 'TNT-001', '922604839', 'CC', 'Carlos', 'Fernandez',
        'Rodriguez', '1990-01-01', 'F', 'carlos.fernandez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 3000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'Branch 710', 'https://i.pravatar.cc/150?u=EID-0080',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'e05192f6-1862-42e0-a4e6-fea2bb598d3d', 'ad2e8b94-34f5-4a2e-82ab-13aebb3e636d', 'PEN'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0081', 'TNT-001', '900967299', 'SSN', 'Brian', 'Martin',
        'Smith', '1990-01-01', 'F', 'brian.martin@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Chief Financial Officer', 'HQ', 'https://i.pravatar.cc/150?u=EID-0081',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0082', 'TNT-001', '176352604', 'CC', 'Catalina', 'Cruz',
        'Romero', '1990-01-01', 'F', 'catalina.cruz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Finance Manager', 'HQ', 'https://i.pravatar.cc/150?u=EID-0082',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0083', 'TNT-001', '932828448', 'CC', 'Andres', 'Cruz',
        'Garcia', '1990-01-01', 'M', 'andres.cruz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Accounting Manager', 'HQ', 'https://i.pravatar.cc/150?u=EID-0083',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0084', 'TNT-001', '780375781', 'SSN', 'David', 'Davis',
        'Smith', '1990-01-01', 'M', 'david.davis@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'VP of HR', 'HQ', 'https://i.pravatar.cc/150?u=EID-0084',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '6d339d5f-7c10-48b4-9553-3a40d5e1f46c', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0085', 'TNT-001', '187941093', 'CC', 'Luis', 'Romero',
        'Rodriguez', '1990-01-01', 'M', 'luis.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'HR Manager', 'HQ', 'https://i.pravatar.cc/150?u=EID-0085',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0086', 'TNT-001', '177477165', 'SSN', 'David', 'Taylor',
        'Smith', '1990-01-01', 'F', 'david.taylor@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'W2', 'Fijo', 5000,
        'Operations', 'Sales', 'CC01', 'Marketing Director', 'HQ', 'https://i.pravatar.cc/150?u=EID-0086',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', '704c063e-8eaa-4889-979d-d0bee5da55af', '0facfc7e-2e3c-4ed4-852c-e80f79c0d3b9', 'USD'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0087', 'TNT-001', '888523853', 'CC', 'Ana', 'Ortiz',
        'Fernandez', '1990-01-01', 'M', 'ana.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Financial Analyst', 'HQ', 'https://i.pravatar.cc/150?u=EID-0087',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0088', 'TNT-001', '786720891', 'CC', 'Mateo', 'Rodriguez',
        'Torres', '1990-01-01', 'M', 'mateo.rodriguez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Accounting Assistant', 'HQ', 'https://i.pravatar.cc/150?u=EID-0088',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0089', 'TNT-001', '320162086', 'CC', 'Luis', 'Garcia',
        'Guzman', '1990-01-01', 'F', 'luis.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Business Plan Admin', 'HQ', 'https://i.pravatar.cc/150?u=EID-0089',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0090', 'TNT-001', '372848879', 'CC', 'Alejandro', 'Rojas',
        'Rodriguez', '1990-01-01', 'M', 'alejandro.rojas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'HR Generalist', 'HQ', 'https://i.pravatar.cc/150?u=EID-0090',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0091', 'TNT-001', '311263026', 'CC', 'Camila', 'Cruz',
        'Garcia', '1990-01-01', 'M', 'camila.cruz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Marketing Specialist', 'HQ', 'https://i.pravatar.cc/150?u=EID-0091',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0092', 'TNT-001', '775508301', 'CC', 'Daniel', 'Suarez',
        'Gomez', '1990-01-01', 'F', 'daniel.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Financial Analyst', 'HQ', 'https://i.pravatar.cc/150?u=EID-0092',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0093', 'TNT-001', '518897057', 'CC', 'Mateo', 'Martinez',
        'Diaz', '1990-01-01', 'F', 'mateo.martinez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Accounting Assistant', 'HQ', 'https://i.pravatar.cc/150?u=EID-0093',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0094', 'TNT-001', '717431427', 'CC', 'Daniel', 'Gomez',
        'Morales', '1990-01-01', 'F', 'daniel.gomez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Business Plan Admin', 'HQ', 'https://i.pravatar.cc/150?u=EID-0094',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0095', 'TNT-001', '496093455', 'CC', 'Juan', 'Rios',
        'Perez', '1990-01-01', 'M', 'juan.rios@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'HR Generalist', 'HQ', 'https://i.pravatar.cc/150?u=EID-0095',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0096', 'TNT-001', '145550964', 'CC', 'Ana', 'Reyes',
        'Lopez', '1990-01-01', 'F', 'ana.reyes@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Marketing Specialist', 'HQ', 'https://i.pravatar.cc/150?u=EID-0096',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0097', 'TNT-001', '927764477', 'CC', 'Juan', 'Ortiz',
        'Gomez', '1990-01-01', 'M', 'juan.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Financial Analyst', 'HQ', 'https://i.pravatar.cc/150?u=EID-0097',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0098', 'TNT-001', '873391352', 'CC', 'Valentina', 'Lopez',
        'Perez', '1990-01-01', 'F', 'valentina.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Accounting Assistant', 'HQ', 'https://i.pravatar.cc/150?u=EID-0098',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0099', 'TNT-001', '579731162', 'CC', 'Luis', 'Reyes',
        'Reyes', '1990-01-01', 'M', 'luis.reyes@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Business Plan Admin', 'HQ', 'https://i.pravatar.cc/150?u=EID-0099',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0100', 'TNT-001', '812149035', 'CC', 'Luis', 'Rodriguez',
        'Rios', '1990-01-01', 'F', 'luis.rodriguez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'HR Generalist', 'HQ', 'https://i.pravatar.cc/150?u=EID-0100',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0101', 'TNT-002', '242976057', 'CC', 'Pedro', 'Romero',
        'Lopez', '1990-01-01', 'F', 'pedro.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'CEO', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0101',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0102', 'TNT-002', '470623555', 'CC', 'Luis', 'Guzman',
        'Romero', '1990-01-01', 'F', 'luis.guzman@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Operations Manager', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0102',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0103', 'TNT-002', '905538696', 'CC', 'Pedro', 'Garcia',
        'Cruz', '1990-01-01', 'M', 'pedro.garcia@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0103',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0104', 'TNT-002', '429131431', 'CC', 'Maria', 'Gomez',
        'Perez', '1990-01-01', 'M', 'maria.gomez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0104',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0105', 'TNT-002', '697114948', 'CC', 'Andres', 'Lopez',
        'Fernandez', '1990-01-01', 'M', 'andres.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0105',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0106', 'TNT-002', '151422682', 'CC', 'Alejandro', 'Lopez',
        'Gomez', '1990-01-01', 'F', 'alejandro.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0106',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0107', 'TNT-002', '914943094', 'CC', 'Pedro', 'Ortiz',
        'Torres', '1990-01-01', 'M', 'pedro.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0107',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0108', 'TNT-002', '206587325', 'CC', 'Valentina', 'Perez',
        'Reyes', '1990-01-01', 'F', 'valentina.perez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0108',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0109', 'TNT-002', '370558935', 'CC', 'Ana', 'Suarez',
        'Fernandez', '1990-01-01', 'F', 'ana.suarez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0109',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0110', 'TNT-002', '421999034', 'CC', 'Andres', 'Ortiz',
        'Gomez', '1990-01-01', 'M', 'andres.ortiz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0110',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0111', 'TNT-002', '144516684', 'CC', 'Luis', 'Rios',
        'Suarez', '1990-01-01', 'F', 'luis.rios@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0111',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0112', 'TNT-002', '908896211', 'CC', 'Andres', 'Romero',
        'Diaz', '1990-01-01', 'F', 'andres.romero@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0112',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0113', 'TNT-002', '330838497', 'CC', 'Luis', 'Rodriguez',
        'Vargas', '1990-01-01', 'F', 'luis.rodriguez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0113',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0114', 'TNT-002', '228380159', 'CC', 'Luis', 'Lopez',
        'Vargas', '1990-01-01', 'F', 'luis.lopez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0114',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0115', 'TNT-002', '660265855', 'CC', 'Valentina', 'Perez',
        'Vargas', '1990-01-01', 'F', 'valentina.perez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Administrative Assistant', 'Birchwood Main', 'https://i.pravatar.cc/150?u=EID-0115',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', '80a41608-f936-46f9-887a-593c1dc994ea', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0116', 'TNT-003', '119171467', 'CC', 'Laura', 'Cruz',
        'Cruz', '1990-01-01', 'F', 'laura.cruz@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Branch Manager', 'AMP Operations', 'https://i.pravatar.cc/150?u=EID-0116',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0117', 'TNT-003', '202709656', 'CC', 'Daniel', 'Morales',
        'Ortiz', '1990-01-01', 'F', 'daniel.morales@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'AMP Operations', 'https://i.pravatar.cc/150?u=EID-0117',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0118', 'TNT-003', '655162897', 'CC', 'Maria', 'Sanchez',
        'Reyes', '1990-01-01', 'M', 'maria.sanchez@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'AMP Operations', 'https://i.pravatar.cc/150?u=EID-0118',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;
INSERT INTO public.dim_employee (
        eid, tenant_id, numero_identificacion, tipo_documento_id, primer_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, genero, email_personal, municipio_dane, direccion_residencia,
        status, fecha_inicio, tipo_contrato, tipo_salario, salario_base,
        area, sub_area, centro_costo, job_title, branch, foto_url,
        continent_id, country_id, city_id, salary_currency
    ) VALUES (
        'EID-0119', 'TNT-003', '285264561', 'CC', 'Sofia', 'Vargas',
        'Gomez', '1990-01-01', 'F', 'sofia.vargas@personal.com', '00000', '123 Fake St',
        'Active', '2024-01-01', 'Indefinido', 'Fijo', 4000000,
        'Operations', 'Sales', 'CC01', 'Loan Officer Assistant', 'AMP Operations', 'https://i.pravatar.cc/150?u=EID-0119',
        '36b8183e-ea29-4c2d-b53c-c07537a5a4ce', 'b107620b-d4f4-4d1c-bafc-7dd14f1b242c', 'e1106313-34d8-4a89-93c4-6c8bf2aae960', 'COP'
    ) ON CONFLICT (eid) DO UPDATE SET 
        primer_nombre = excluded.primer_nombre, 
        primer_apellido = excluded.primer_apellido,
        foto_url = excluded.foto_url,
        job_title = excluded.job_title,
        branch = excluded.branch,
        continent_id = excluded.continent_id,
        country_id = excluded.country_id,
        city_id = excluded.city_id,
        salary_currency = excluded.salary_currency;

-- 5. EMPLOYEE HIERARCHY UPDATES
UPDATE public.dim_employee SET direct_leader_id = 'EID-0004' WHERE eid = 'EID-0016';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0017';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0012' WHERE eid = 'EID-0018';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0019';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0020';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0002' WHERE eid = 'EID-0021';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0003' WHERE eid = 'EID-0022';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0007' WHERE eid = 'EID-0023';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0013' WHERE eid = 'EID-0024';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0002' WHERE eid = 'EID-0025';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0026';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0027';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0028';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0004' WHERE eid = 'EID-0029';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0030';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0031';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0032';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0022' WHERE eid = 'EID-0033';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0004' WHERE eid = 'EID-0034';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0014' WHERE eid = 'EID-0035';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0036';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0037';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0021' WHERE eid = 'EID-0038';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0010' WHERE eid = 'EID-0039';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0040';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0041';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0026' WHERE eid = 'EID-0042';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0043';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0009' WHERE eid = 'EID-0044';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0004' WHERE eid = 'EID-0045';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0014' WHERE eid = 'EID-0046';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0010' WHERE eid = 'EID-0047';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0048';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0049';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0004' WHERE eid = 'EID-0050';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0014' WHERE eid = 'EID-0051';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0015' WHERE eid = 'EID-0052';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0012' WHERE eid = 'EID-0053';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0008' WHERE eid = 'EID-0054';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0001' WHERE eid = 'EID-0055';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0006' WHERE eid = 'EID-0056';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0010' WHERE eid = 'EID-0057';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0026' WHERE eid = 'EID-0058';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0001' WHERE eid = 'EID-0059';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0006' WHERE eid = 'EID-0060';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0061';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0014' WHERE eid = 'EID-0062';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0008' WHERE eid = 'EID-0063';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0015' WHERE eid = 'EID-0064';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0065';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0006' WHERE eid = 'EID-0066';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0067';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0068';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0030' WHERE eid = 'EID-0069';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0007' WHERE eid = 'EID-0070';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0007' WHERE eid = 'EID-0071';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0030' WHERE eid = 'EID-0072';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0073';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0005' WHERE eid = 'EID-0074';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0011' WHERE eid = 'EID-0075';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0006' WHERE eid = 'EID-0076';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0010' WHERE eid = 'EID-0077';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0007' WHERE eid = 'EID-0078';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0002' WHERE eid = 'EID-0079';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0026' WHERE eid = 'EID-0080';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0081' WHERE eid = 'EID-0082';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0081' WHERE eid = 'EID-0083';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0084' WHERE eid = 'EID-0085';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0082' WHERE eid = 'EID-0087';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0083' WHERE eid = 'EID-0088';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0081' WHERE eid = 'EID-0089';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0085' WHERE eid = 'EID-0090';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0086' WHERE eid = 'EID-0091';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0082' WHERE eid = 'EID-0092';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0083' WHERE eid = 'EID-0093';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0081' WHERE eid = 'EID-0094';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0085' WHERE eid = 'EID-0095';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0086' WHERE eid = 'EID-0096';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0082' WHERE eid = 'EID-0097';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0083' WHERE eid = 'EID-0098';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0081' WHERE eid = 'EID-0099';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0085' WHERE eid = 'EID-0100';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0101' WHERE eid = 'EID-0102';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0103';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0104';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0105';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0106';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0107';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0108';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0109';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0110';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0111';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0112';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0113';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0114';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0102' WHERE eid = 'EID-0115';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0116' WHERE eid = 'EID-0117';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0116' WHERE eid = 'EID-0118';
UPDATE public.dim_employee SET direct_leader_id = 'EID-0116' WHERE eid = 'EID-0119';

-- 6. PLAYBOOKS
INSERT INTO public.growthify_playbooks (id, tenant_id, name, category, nodes) VALUES 
('PB-REALTOR-001', 'TNT-001', 'Realtor Outreach', 'commercial', '[{"id":"step-1","title":"Daily Realtor Call","description":"Call at least 10 realtors.","frequency":"Daily","target_count":10,"is_mandatory":true}]')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.growthify_playbooks (id, tenant_id, name, category, nodes) VALUES 
('PB-EMAIL-001', 'TNT-001', 'Email Marketing Camp', 'commercial', '[{"id":"step-1","title":"Email Campaign Review","description":"Check CRM for open rates.","frequency":"Daily","target_count":1,"is_mandatory":true}]')
ON CONFLICT (id) DO NOTHING;
