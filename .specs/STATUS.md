# Estado del proyecto

> Memoria de cada sesión. Se actualiza al terminar, no al empezar.

**Última actualización:** 2026-11-06
**Fase:** 2 — Backend
**Etapa actual:** backend cerrado (2A–2C); la etapa 3 es la siguiente

## Hecho

- `README.md`, `stack.md`, `golden-rules.md` (17 reglas) y este `STATUS.md`.
- Repo en GitHub, workspace pnpm, TypeScript strict y PostgreSQL 17 con Docker.
- **Etapa 1:** esquema `auth` de Better Auth, `profiles`, roles
  `migrator`/`auth_service`/`app_user`, RLS forzado y migraciones forward-only.
- **Etapa 2A — cimientos:** ESLint con `max-lines: 150` y bloqueo de SQL dinámico;
  configuración validada al arrancar con lista blanca (la API nunca lee
  `DATABASE_URL_MIGRATOR`); pools separados y verificación de privilegios;
  auditoría en `audit.auth_event` y `audit.auth_attempt` más `auth.login_throttle`;
  `audit_reader` como único lector; límites por rol; CI con PostgreSQL 17.
- **Etapa 2B — superficie:** Fastify con solo `/trpc` y `/health`; contexto que
  deriva `userId` de la sesión; `register`, `login`, `logout`, `refresh` y `me`;
  errores con mensajes fijos; allowlist de `Origin`, cabeceras de seguridad y
  logs redactados; `withUser` para RLS.
- **Etapa 2C — JWT y endurecimiento:** access token EdDSA de 15 min con `alg`,
  `kid`, `iss`, `aud` y `exp` validados; par Ed25519 en base64 validado al
  arrancar; las respuestas incluyen `accessToken`; `me` acepta cookie o `Bearer`;
  rate limit por cuenta (5/15 min) y por IP (20/15 min) con bloqueo temporal;
  auditoría de eventos e intentos; migración `0006`; 47 tests de backend.
  CI arreglado: la API ignora `DATABASE_URL_MIGRATOR` aunque el job lo defina.

## En curso

- Nada. El backend está cerrado.

## Siguiente paso

Etapa 3 — **frontend de autenticación**:

1. Cliente tRPC tipado y manejo de errores de sesión.
2. Pantallas de registro y login con validación Zod compartida.
3. Access token en memoria; cookie de refresco gestionada por el cliente.
4. Refresco ante `401` con una sola petición en vuelo.
5. Guardas de ruta en Expo Router y cierre de sesión.

## Gate de la etapa 2C — cumplido

| Comprobación | Comando | Estado |
|---|---|---|
| Typecheck del monorepo | `pnpm typecheck` | Verde |
| Lint con límite de 150 líneas | `pnpm lint` | Verde |
| Tests de base de datos (16) | `pnpm -C database test` | Verde |
| Tests de backend (47) | `pnpm -C backend test` | Verde |
| Privilegios reales | `pnpm -C backend verify` | Verde |
| Migraciones desde base vacía | `pnpm db:reset` + bootstrap + migrate | Verde |

## Comandos

```bash
pnpm db:up            # levanta PostgreSQL en 5433
pnpm db:bootstrap     # crea o actualiza los roles y sus límites
pnpm db:migrate       # aplica migraciones pendientes
pnpm typecheck
pnpm lint
pnpm test
pnpm -C backend verify
pnpm -C backend keys  # genera un par Ed25519 en base64 para el .env
pnpm -C backend dev   # API en http://localhost:3000
pnpm db:reset         # borra el volumen y reconstruye
```

Tras `db:reset` hay que ejecutar `db:bootstrap` y `db:migrate`.

## Comportamiento del esquema

- Better Auth en `auth`, negocio en `public`, auditoría en `audit`. Sin cruces de
  permisos: `auth_service` no toca `public` y `app_user` no toca `auth` ni `audit`.
- El contexto de RLS va por transacción con `set_config('app.user_id', ..., true)`.
- `app.current_user_id()` devuelve `text` porque Better Auth usa ids de texto.
- `INSERT ... RETURNING` no se usa donde el rol solo tiene `INSERT`.
- La auditoría es append-only por permisos y trigger, también frente a
  superusuario. `TRUNCATE` solo cede con `app.maintenance = 'on'` en tests.

## Decisiones registradas

- `0001-audit-separation.md` — dos tablas de auditoría y hash del identificador.
- `0002-token-model.md` — JWT EdDSA de 15 min más refresh opaco. Revisado en 2C:
  Better Auth no rota el valor del refresh, solo su expiración.
- `0003-trpc-surface.md` — superficie tRPC, cookie `httpOnly` y allowlist de origen.

## Bloqueado

- Nada.

## Notas abiertas

- Nombre de marca pendiente. `NexxusApp` es carpeta y `applicationId` provisional.
- `applicationId` definitivo debe verificarse antes del primer upload a Play Store.
- Repo legacy IronHealth sin commitear: pendiente tag `legacy/ironhealth-v1`.
- `@better-auth/cli` 1.4.21 frente a `better-auth` 1.7.17: alinear cuando se
  regenere el esquema.
- Drizzle Kit pide confirmación interactiva si dos tablas comparten nombre entre
  esquemas; generar migraciones en pasos pequeños.
- Rotación real del refresh y revocación instantánea de JWT: en backlog.
- Rotar la clave JWT exige desplegar antes el nuevo `kid` y la pública nueva.
  Hoy solo hay un `kid` activo por proceso.
- Better Auth escribe "User not found" en stderr en desarrollo; sin email ni
  contraseña.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Documentación | Cerrada |
| 1 | Base de datos: auth | Cerrada |
| 2A | Backend: cimientos | Cerrada |
| 2B | Backend: superficie autenticada | Cerrada |
| 2C | Backend: JWT y endurecimiento | **Cerrada** |
| 3 | Frontend: auth | Siguiente |
| 4 | Walking skeleton | Pendiente |
