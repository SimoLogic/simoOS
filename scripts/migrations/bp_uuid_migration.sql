-- ============================================================================
-- SIMO INTELLISENSE: MIGRACIÓN DE TEXTOS A UUID EN BUSINESS PLAN
-- ============================================================================
-- Este script reemplaza los mapeos de texto de la interfaz por identificadores
-- relacionales rígidos (UUIDs) para asegurar integridad referencial absoluta.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- FASE 1: DESACTIVAR TRIGGERS ANTIGUOS Y CREAR COLUMNAS TEMPORALES (UUID)
-- ────────────────────────────────────────────────────────────────────────────
-- ¡CRÍTICO! Debemos eliminar el trigger antiguo antes de hacer UPDATES
-- para que no bloquee las modificaciones.
DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;

ALTER TABLE bp_playbook_steps ADD COLUMN stakeholder_id UUID;
ALTER TABLE bp_playbook_steps ADD COLUMN requested_to_id UUID;
ALTER TABLE bp_playbooks ADD COLUMN global_owner_ids UUID[] DEFAULT '{}';


-- ────────────────────────────────────────────────────────────────────────────
-- FASE 2: MIGRACIÓN DE DATOS (TEXTO → UUID)
-- Traducimos los Nombres guardados actualmente a sus IDs en el catálogo HR
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Mapear Stakeholders a dim_role_title
UPDATE bp_playbook_steps s
SET stakeholder_id = (SELECT id FROM dim_role_title WHERE role_title = s.stakeholder AND tenant_id = s.org_id LIMIT 1)
WHERE stakeholder IS NOT NULL AND stakeholder != 'DROP' AND stakeholder != '';

-- 2.2 Mapear Stakeholders a dim_external_role (Fallback)
UPDATE bp_playbook_steps s
SET stakeholder_id = (SELECT id FROM dim_external_role WHERE name = s.stakeholder AND org_id = s.org_id LIMIT 1)
WHERE stakeholder IS NOT NULL AND stakeholder != 'DROP' AND stakeholder != '' AND stakeholder_id IS NULL;

-- 2.3 Mapear Requested To (Soportes)
UPDATE bp_playbook_steps s
SET requested_to_id = (SELECT id FROM dim_role_title WHERE role_title = s.requested_to AND tenant_id = s.org_id LIMIT 1)
WHERE requested_to IS NOT NULL AND requested_to != 'DROP' AND requested_to != '';

UPDATE bp_playbook_steps s
SET requested_to_id = (SELECT id FROM dim_external_role WHERE name = s.requested_to AND org_id = s.org_id LIMIT 1)
WHERE requested_to IS NOT NULL AND requested_to != 'DROP' AND requested_to != '' AND requested_to_id IS NULL;

-- 2.4 Mapear global_owners (Array)
DO $$
DECLARE
    r RECORD;
    g_owner TEXT;
    new_uuid UUID;
    uuid_array UUID[];
BEGIN
    FOR r IN SELECT id, org_id, global_owners FROM bp_playbooks WHERE array_length(global_owners, 1) > 0 LOOP
        uuid_array := '{}';
        FOREACH g_owner IN ARRAY r.global_owners LOOP
            -- Tratar de buscar en dim_role_title
            SELECT id INTO new_uuid FROM dim_role_title WHERE role_title = g_owner AND tenant_id = r.org_id LIMIT 1;
            IF new_uuid IS NULL THEN
                -- Tratar de buscar en dim_external_role
                SELECT id INTO new_uuid FROM dim_external_role WHERE name = g_owner AND org_id = r.org_id LIMIT 1;
            END IF;
            
            IF new_uuid IS NOT NULL THEN
                uuid_array := array_append(uuid_array, new_uuid);
            END IF;
        END LOOP;
        
        UPDATE bp_playbooks SET global_owner_ids = uuid_array WHERE id = r.id;
    END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- FASE 3: ELIMINAR COLUMNAS ANTIGUAS
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE bp_playbook_steps DROP COLUMN stakeholder;
ALTER TABLE bp_playbook_steps DROP COLUMN requested_to;
ALTER TABLE bp_playbooks DROP COLUMN global_owners;


-- ────────────────────────────────────────────────────────────────────────────
-- FASE 4: NUEVO TRIGGER DE INTEGRIDAD POLIMÓRFICA (EL ESCUDO)
-- Validar que el valor sea un UUID activo en Rol Interno o Externo
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_playbook_roles_match()
RETURNS TRIGGER AS $$
DECLARE
    internal_exists BOOLEAN;
    external_exists BOOLEAN;
BEGIN
    -- 1. Validate stakeholder_id
    IF NEW.stakeholder_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE id = NEW.stakeholder_id AND status = 'Active' AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE id = NEW.stakeholder_id AND status = 'Active' AND org_id = NEW.org_id
        ) INTO external_exists;

        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'StakeholderID (%) no corresponde a un Rol Activo en el Roster de HOPSI ni Roles Externos.', NEW.stakeholder_id;
        END IF;
    END IF;

    -- 2. Validate requested_to_id
    IF NEW.requested_to_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.dim_role_title 
            WHERE id = NEW.requested_to_id AND status = 'Active' AND tenant_id = NEW.org_id
        ) INTO internal_exists;

        SELECT EXISTS (
            SELECT 1 FROM public.dim_external_role 
            WHERE id = NEW.requested_to_id AND status = 'Active' AND org_id = NEW.org_id
        ) INTO external_exists;

        IF NOT internal_exists AND NOT external_exists THEN
            RAISE EXCEPTION 'RequestedToID (%) no corresponde a un Rol Activo en el Roster de HOPSI ni Roles Externos.', NEW.requested_to_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger en la tabla (apunta a bp_playbook_steps)
DROP TRIGGER IF EXISTS tr_check_playbook_roles_match ON public.bp_playbook_steps;
CREATE TRIGGER tr_check_playbook_roles_match
    BEFORE INSERT OR UPDATE ON public.bp_playbook_steps
    FOR EACH ROW EXECUTE PROCEDURE check_playbook_roles_match();

-- Refrescar esquema de memoria para la API
NOTIFY pgrst, 'reload schema';
