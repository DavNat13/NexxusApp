# Estado del proyecto

> Memoria de cada sesión. Se actualiza al terminar, no al empezar.

**Última actualización:** 2026-11-05
**Fase:** 1 — Base de datos
**Etapa actual:** etapa 1 cerrada

## Hecho

- `README.md` — visión, módulos, alcance del MVP, método de trabajo, stack y roadmap.
- `stack.md` — decisiones cerradas, incluida Better Auth self-hosted.
- `golden-rules.md` — 17 reglas con su verificación.
- Repo en GitHub, workspace pnpm, TypeScript strict y `docker-compose` con PostgreSQL 17.
- **Etapa 1 completa:** esquema `auth` de Better Auth, `profiles`, `auth_audit_log`,
  roles `migrator`/`auth_service`/`app_user`, RLS forzado y migraciones forward-only.
- 4 archivos de test de seguridad, 12 casos en verde, reproducibles desde una base vacía.

## En curso

- Nada. La etapa 1 está cerrada y el siguiente paso es la etapa 2.

## Siguiente paso

Etapa 2 — **backend con autenticación blindada**:

1. Fastify + tRPC + Zod con arranque limpio.
2. Registro, login, refresh y logout contra Better Auth.
3. Rate limit por IP y por cuenta, bloqueo por intentos y auditoría en `auth_audit_log`.
4. Tests de integración contra el PostgreSQL real, sin mocks.
5. Configuración por entorno validada al arrancar.

## Gate de la etapa 1 — cumplido

| # | Test | Archivo | Estado |
|---|---|---|---|
| 1 | A no lee filas de B | `tests/security/isolation.test.ts` | Verde |
| 2 | Sin contexto no se ve nada | `tests/security/no-context.test.ts` | Verde |
| 3 | No se inserta con `user_id` ajeno | `tests/security/foreign-insert.test.ts` | Verde |
| 4 | Append-only rechaza UPDATE y DELETE | `tests/security/append-only.test.ts` | Verde |

El append-only se probó sobre `auth_audit_log`, no sobre `workout_sets`, para no
fijar el modelo de entrenamiento antes de tiempo. El mismo test se repetirá sobre
`workout_sets` cuando exista esa tabla.

## Comandos

```bash
pnpm db:up          # levanta PostgreSQL en 5433
pnpm db:bootstrap   # crea o actualiza los roles
pnpm db:migrate     # aplica migraciones pendientes
pnpm -C database test
pnpm db:reset       # borra el volumen y reconstruye
```

Tras `db:reset` hay que ejecutar `db:bootstrap` y `db:migrate`.

## Decisiones de la etapa 1

- Las tablas de Better Auth viven en el esquema `auth`; el negocio en `public`.
- `auth_service` no tiene permisos sobre `public` y `app_user` no los tiene sobre `auth`.
- `auth_audit_log` no tiene FK a `auth.user`: el histórico sobrevive al borrado de la
  cuenta y un `ON DELETE SET NULL` dispararía el trigger append-only.
- El contexto de RLS se pasa por transacción con `set_config('app.user_id', ..., true)`.
- `app.current_user_id()` devuelve `text` porque Better Auth genera ids de texto.

## Bloqueado

- Nada.

## Notas abiertas

- Nombre de marca pendiente. `NexxusApp` es solo carpeta y `applicationId` provisional.
- `applicationId` definitivo debe verificarse antes del primer upload a Play Store.
- Repo legacy IronHealth sin commitear: pendiente rama o tag `legacy/ironhealth-v1`.
- La regla 17 y el typecheck aún no están automatizados en CI. Se añade ESLint con
  `max-lines: 150` y el workflow de GitHub Actions al abrir la etapa 2.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Documentación | Cerrada |
| 1 | Base de datos: auth | **Cerrada** |
| 2 | Backend: auth blindada | Siguiente |
| 3 | Frontend: auth | Pendiente |
| 4 | Walking skeleton | Pendiente |
