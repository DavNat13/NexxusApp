# Estado del proyecto

> Memoria de cada sesión. Se actualiza al terminar, no al empezar.

**Última actualización:** 2026-11-05
**Fase:** 0 — Documentación
**Etapa actual:** cierre de documentación base

## Hecho

- `README.md` — visión, módulos, alcance del MVP, método de trabajo, stack y roadmap.
- `stack.md` — decisiones cerradas, incluida Better Auth self-hosted.
- `golden-rules.md` — 17 reglas con su verificación.
- Etapas de construcción definidas con gates entre ellas.

## En curso

- Nada. La documentación base está cerrada y pendiente de aprobación.

## Siguiente paso

Etapa 1 — **base de datos, solo autenticación**:

1. `docker-compose` con PostgreSQL local.
2. Roles `auth_service` y `app_user`, ninguno con `BYPASSRLS`.
3. Esquema de Better Auth con Drizzle: `user`, `session`, `account`, `verification`.
4. Migraciones forward-only.
5. Los 4 tests de seguridad.

## Gate de la etapa 1

No se pasa al backend hasta que estos cuatro tests estén en verde:

1. El usuario A no puede leer filas del usuario B.
2. Sin `app.user_id` definido, no se devuelve ninguna fila.
3. No se puede insertar una fila con un `user_id` ajeno.
4. `workout_sets` rechaza UPDATE y DELETE.

## Bloqueado

- Nada.

## Notas abiertas

- Nombre de marca pendiente. `NexxusApp` es solo carpeta y `applicationId` provisional.
- `applicationId` definitivo debe verificarse antes del primer upload a Play Store.
- Repo legacy IronHealth sin commitear: pendiente crear rama o tag `legacy/ironhealth-v1` como respaldo.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Documentación | Cerrada, pendiente de aprobación |
| 1 | Base de datos: auth | Pendiente |
| 2 | Backend: auth blindada | Pendiente |
| 3 | Frontend: auth | Pendiente |
| 4 | Walking skeleton | Pendiente |
