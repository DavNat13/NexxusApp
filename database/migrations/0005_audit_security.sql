-- Etapa 2A: privilegios de auditoría, contrato de datos y endurecimiento.

-- Escritura solo para auth_service; lectura solo para audit_reader.
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
GRANT USAGE ON SCHEMA audit TO auth_service, audit_reader;

GRANT INSERT ON audit.auth_event, audit.auth_attempt TO auth_service;
GRANT USAGE ON SEQUENCE audit.auth_event_id_seq, audit.auth_attempt_id_seq TO auth_service;

GRANT SELECT ON audit.auth_event, audit.auth_attempt TO audit_reader;

REVOKE ALL ON audit.auth_event, audit.auth_attempt FROM app_user;

-- Contadores de bloqueo: los usa el mismo servicio que valida credenciales.
GRANT SELECT, INSERT, UPDATE ON auth.login_throttle TO auth_service;
REVOKE ALL ON auth.login_throttle FROM app_user;
REVOKE ALL ON auth.login_throttle FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Append-only: UPDATE y DELETE por trigger de fila, TRUNCATE por trigger de
-- sentencia. El harness de tests puede truncar con app.maintenance = 'on'.
-- ---------------------------------------------------------------------------
CREATE TRIGGER audit_auth_event_immutable
  BEFORE UPDATE OR DELETE ON audit.auth_event
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_mutation();

CREATE TRIGGER audit_auth_attempt_immutable
  BEFORE UPDATE OR DELETE ON audit.auth_attempt
  FOR EACH ROW
  EXECUTE FUNCTION app.reject_mutation();

CREATE OR REPLACE FUNCTION app.reject_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.maintenance', true) = 'on' THEN
    RETURN NULL;
  END IF;

  RAISE EXCEPTION 'append-only: % no admite TRUNCATE', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER audit_auth_event_no_truncate
  BEFORE TRUNCATE ON audit.auth_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION app.reject_truncate();

CREATE TRIGGER audit_auth_attempt_no_truncate
  BEFORE TRUNCATE ON audit.auth_attempt
  FOR EACH STATEMENT
  EXECUTE FUNCTION app.reject_truncate();

-- ---------------------------------------------------------------------------
-- Contrato de datos: la auditoría no puede ser un cajón de texto libre.
-- ---------------------------------------------------------------------------
ALTER TABLE audit.auth_event
  ADD CONSTRAINT auth_event_outcome_check CHECK (outcome IN ('success', 'failure')),
  ADD CONSTRAINT auth_event_user_agent_check CHECK (char_length(user_agent) <= 512),
  ADD CONSTRAINT auth_event_metadata_size_check CHECK (pg_column_size(metadata) <= 2048);

ALTER TABLE audit.auth_attempt
  ADD CONSTRAINT auth_attempt_outcome_check CHECK (outcome IN ('success', 'failure')),
  ADD CONSTRAINT auth_attempt_hash_check CHECK (identifier_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT auth_attempt_user_agent_check CHECK (char_length(user_agent) <= 512),
  ADD CONSTRAINT auth_attempt_metadata_size_check CHECK (pg_column_size(metadata) <= 2048);

ALTER TABLE auth.login_throttle
  ADD CONSTRAINT login_throttle_failures_check CHECK (failures >= 0);

-- ---------------------------------------------------------------------------
-- Unicidad de email sin distinguir mayúsculas, como red de seguridad ante
-- cualquier camino que se salte la normalización de la aplicación.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX user_email_lower_unique ON auth."user" (lower(email));

-- ---------------------------------------------------------------------------
-- Tablas futuras: que no nazcan sin permisos.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  GRANT INSERT ON TABLES TO auth_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  GRANT SELECT ON TABLES TO audit_reader;
