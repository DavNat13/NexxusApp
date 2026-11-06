-- Etapa 1: permisos, contexto de sesión, RLS y tablas append-only.

-- Esquema de utilidades. No contiene datos de negocio.
CREATE SCHEMA IF NOT EXISTS app;

-- Identidad del usuario actual. El backend la fija por transacción con
-- SET LOCAL app.user_id. Sin contexto devuelve NULL y las políticas no ven nada.
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;

-- ---------------------------------------------------------------------------
-- auth_service: solo el esquema auth. No puede nombrar tablas de negocio.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA auth TO auth_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO auth_service;
REVOKE ALL ON SCHEMA public FROM auth_service;
REVOKE ALL ON SCHEMA app FROM auth_service;

-- ---------------------------------------------------------------------------
-- app_user: solo tablas de negocio, siempre bajo RLS.
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA auth FROM app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA app TO app_user;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO app_user;

-- El registro de auditoría solo admite altas.
GRANT INSERT ON auth_audit_log TO app_user;
GRANT USAGE ON SEQUENCE auth_audit_log_id_seq TO app_user;

-- ---------------------------------------------------------------------------
-- profiles: cada usuario ve y modifica únicamente su fila.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles
  FOR SELECT TO app_user
  USING (user_id = app.current_user_id());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO app_user
  WITH CHECK (user_id = app.current_user_id());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO app_user
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

CREATE POLICY profiles_delete ON profiles
  FOR DELETE TO app_user
  USING (user_id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- auth_audit_log: append-only por permisos y por trigger.
-- Si algún día se concede UPDATE por error, el trigger sigue bloqueando.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % no admite %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER auth_audit_log_append_only
  BEFORE UPDATE OR DELETE ON auth_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_mutation();

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY auth_audit_log_insert ON auth_audit_log
  FOR INSERT TO app_user
  WITH CHECK (user_id = app.current_user_id());

-- El registro se lee solo con el rol de migraciones, nunca desde la API.
REVOKE ALL ON auth_audit_log FROM PUBLIC;
