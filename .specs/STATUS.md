# Estado del proyecto

> Memoria de cada sesión. Se actualiza al terminar, no al empezar.

**Última actualización:** 2026-11-05
**Fase:** 2 — Backend
**Etapa actual:** etapa 2A cerrada; 2B es la siguiente

## Hecho

- `README.md` — visión, módulos, alcance del MVP, método de trabajo, stack y roadmap.
- `stack.md` — decisiones cerradas, incluida Better Auth self-hosted.
- `golden-rules.md` — 17 reglas con su verificación.
- Repo en GitHub, workspace pnpm, TypeScript strict y `docker-compose` con PostgreSQL 17.
- **Etapa 1 completa:** esquema `auth` de Better Auth, `profiles`, roles
  `migrator`/`auth_service`/`app_user`, RLS forzado y migraciones forward-only.
- **Etapa 2A completa — cimientos del backend:**
  - ESLint 10 flat config con `max-lines: 150` y bloqueo de `sql.unsafe`,
    `sql.raw` y `eval`.
  - Paquete `backend/` con configuración validada al arrancar. El `.env` raíz se
    filtra por lista blanca: la API nunca ve `DATABASE_URL_MIGRATOR` ni la clave
    del superusuario.
  - Dos pools separados (`auth_service` y `app_user`) y verificación de
    privilegios en el arranque, antes de aceptar tráfico.
  - Auditoría separada en `audit.auth_event` y `audit.auth_attempt`, más
    `auth.login_throttle`. Migraciones `0003`–`0005`.
  - `audit_reader` (`NOLOGIN`) como único lector; `auth_service` escribe pero no
    lee; `app_user` no tiene acceso.
  - Límites por rol: `statement_timeout`, `lock_timeout`,
    `idle_in_transaction_session_timeout` y `CONNECTION LIMIT`.
  - Workflow de CI con PostgreSQL 17: bootstrap, migraciones, typecheck, lint y
    tests.

## En curso

- Nada. La etapa 2A está cerrada.

## Siguiente paso

Etapa 2B — **superficie autenticada**:

1. App Fastify con tRPC montado y manejo de errores sin filtrar detalles.
2. Contexto de tRPC que verifica la sesión y deriva `userId`; nunca del cliente.
3. Procedimientos `register`, `login`, `logout`, `refresh`.
4. Logs con redacción de cookies, tokens, emails y contraseñas.
5. Tests de integración contra PostgreSQL real.

Etapa 2C — JWT EdDSA, rotación y endurecimiento (ver ADR 0002).

## Gate de la etapa 2A — cumplido

| Comprobación | Comando | Estado |
|---|---|---|
| Typecheck de todo el monorepo | `pnpm typecheck` | Verde |
| Lint con límite de 150 líneas | `pnpm lint` | Verde |
| Tests de base de datos (16) | `pnpm -C database test` | Verde |
| Tests de backend (11) | `pnpm -C backend test` | Verde |
| Privilegios reales al arrancar | `pnpm -C backend verify` | Verde |

Los tests de base de datos arrancan desde una base vacía: `db:reset`,
`db:bootstrap`, `db:migrate` y `test`.

## Comandos

```bash
pnpm db:up          # levanta PostgreSQL en 5433
pnpm db:bootstrap   # crea o actualiza los roles y sus límites
pnpm db:migrate     # aplica migraciones pendientes
pnpm typecheck
pnpm lint
pnpm test
pnpm -C backend verify
pnpm db:reset       # borra el volumen y reconstruye
```

Tras `db:reset` hay que ejecutar `db:bootstrap` y `db:migrate`.

## Comportamiento del esquema

- Las tablas de Better Auth viven en `auth`; el negocio en `public`; la auditoría
  en `audit`.
- `auth_service` no tiene permisos sobre `public` y `app_user` no los tiene sobre
  `auth` ni sobre `audit`.
- El contexto de RLS se pasa por transacción con
  `set_config('app.user_id', ..., true)`.
- `app.current_user_id()` devuelve `text` porque Better Auth genera ids de texto.
- `INSERT ... RETURNING` falla en tablas donde el rol solo tiene `INSERT`; no se
  usa en auditoría.
- La auditoría es append-only por permisos y por trigger; también frente a
  superusuario. `TRUNCATE` solo cede con `app.maintenance = 'on'` en una
  transacción del harness.

## Decisiones registradas

- `decisions/0001-audit-separation.md` — dos tablas de auditoría y por qué el
  identificador va hasheado.
- `decisions/0002-token-model.md` — JWT EdDSA de 15 min más refresh opaco de 14
  días, con la ventana de revocación aceptada.

## Bloqueado

- Nada.

## Notas abiertas

- Nombre de marca pendiente. `NexxusApp` es solo carpeta y `applicationId` provisional.
- `applicationId` definitivo debe verificarse antes del primer upload a Play Store.
- Repo legacy IronHealth sin commitear: pendiente rama o tag `legacy/ironhealth-v1`.
- `@better-auth/cli` está en 1.4.21 y `better-auth` en 1.7.17. No afecta al
  runtime, pero el CLI solo se usa para generar el esquema; conviene alinearlos.
- Drizzle Kit pide confirmación interactiva si dos tablas comparten nombre entre
  esquemas. Las migraciones se generan en pasos pequeños.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Documentación | Cerrada |
| 1 | Base de datos: auth | Cerrada |
| 2A | Backend: cimientos | **Cerrada** |
| 2B | Backend: superficie autenticada | Siguiente |
| 2C | Backend: JWT y endurecimiento | Pendiente |
| 3 | Frontend: auth | Pendiente |
| 4 | Walking skeleton | Pendiente |
