# Estado del proyecto

> Memoria de cada sesión. Se actualiza al terminar, no al empezar.

**Última actualización:** 2026-11-07
**Fase:** 3.5 — Cierre de auth
**Etapa actual:** fase 3 cerrada (registro cerrado); siguiente: recuperación por correo

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
  auditoría de eventos e intentos; migración `0006`.
  CI arreglado: la API ignora `DATABASE_URL_MIGRATOR` aunque el job lo defina.
- **Etapa 3 — frontend de autenticación:**
  - Paquete `shared/` con los esquemas Zod de registro y login, usados por la API
    y por la app. Un cambio de regla se hace una sola vez.
  - App Expo 58 + Expo Router con TypeScript strict, rutas `/login`, `/register`
    y `/training`, y guardas que redirigen según la sesión.
  - Cliente tRPC tipado con el tipo `AppRouter` del backend, `httpLink` y
    `@trpc/react-query`.
  - Access token solo en memoria. Ante un `401` se pide un token nuevo con la
    cookie de refresco y se reintenta una vez; una sola petición de refresco en
    vuelo aunque fallen varias llamadas a la vez.
  - Pantallas de login y registro con React Hook Form y los mensajes de Zod en
    español; cierre de sesión desde la pantalla de entrenamiento.
  - CORS con lista blanca y credenciales para que Expo web pueda usar la cookie.
- **Fase 3.5 — fase 2: refresh nativo y sesión offline:**
  - Plugin `bearer` con `requireSignature: true`: un token opaco crudo o un JWT
    de acceso no se confunden con un refresh.
  - Cabecera `x-client-platform: native`; el contexto ignora cookies en nativo y
    no se emite `Set-Cookie`. Web conserva la cookie `httpOnly`.
  - `register` y `login` devuelven `refreshToken` (valor firmado de
    `set-auth-token`) solo en nativo. `refresh` y `logout` aceptan
    `{ refreshToken? }` y validan con `Authorization: Bearer`.
  - Cliente: `expo-secure-store` para el refresh en Android, no-op en web;
    usuario cacheado en AsyncStorage sin tokens; `android.allowBackup: false`.
  - Controlador de refresco puro con `refreshed | rejected | offline`, una sola
    petición en vuelo y época que descarta resultados posteriores a un logout.
  - Arranque optimista con usuario cacheado; las guardas usan
    `checking | authenticated | anonymous` y no expulsan por falta de red.
  - Vitest en el frontend para el controlador y el estado de sesión.
- **Fase 3.5 — fase 3: registro cerrado:**
  - `ALLOWED_EMAILS` normalizada a minúsculas y validada con Zod; obligatoria en
    producción y abierta en desarrollo/test cuando está vacía (con aviso).
  - La comprobación ocurre antes de Better Auth. El error es el mismo que un
    registro fallido: `BAD_REQUEST` con "No se pudo crear la cuenta."
  - Rate limit por IP con clave `register-ip`, 10 fallos/15 min y bloqueo de
    15 min; se reinicia al registrar con éxito.
  - Auditoría `not_allowed`, `rejected` y `locked` con el hash del correo.
  - `schema.ts` dividido en `base-schema.ts` y `registration-schema.ts` para no
    superar 150 líneas.

## En curso

- Nada. La fase 3 está cerrada.

## Siguiente paso

Fase 4 — **recuperación de contraseña por correo**:

1. `nodemailer` con SMTP de Gmail, timeouts y envío no bloqueante.
2. Plugin `emailOTP`: 6 dígitos, 15 min, 3 intentos, hash y rotación.
3. Procedimientos `requestPasswordReset` y `resetPassword` con respuesta
   genérica, rate limit y auditoría.
4. Mailer falso en tests; plantilla sin PII.
5. Pantallas de solicitud y reset en el frontend.

Después: endurecimientos (fase 5) y paleta y rediseño (fase 6).

## Gate de la etapa 3 — cumplido

| Comprobación | Comando | Estado |
|---|---|---|
| Typecheck de los 4 paquetes | `pnpm typecheck` | Verde |
| Lint con límite de 150 líneas | `pnpm lint` | Verde |
| Tests de base de datos (16) | `pnpm -C database test` | Verde |
| Tests de backend (49) | `pnpm -C backend test` | Verde |
| Bundle Android de Expo | `expo export --platform android` | Verde |
| Privilegios reales | `pnpm -C backend verify` | Verde |

## Gate de la fase 2 — cumplido

| Comprobación | Comando | Estado |
|---|---|---|
| Typecheck de los 4 paquetes | `pnpm typecheck` | Verde |
| Lint con límite de 150 líneas | `pnpm lint` | Verde |
| Tests de base de datos (16) | `pnpm -C database test` | Verde |
| Tests de backend (66) | `pnpm -C backend test` | Verde |
| Tests de frontend (12) | `pnpm -C frontend test` | Verde |
| Bundle Android de Expo | `expo export --platform android` | Verde |

## Comandos

```bash
pnpm db:up              # levanta PostgreSQL en 5433
pnpm -C database db:bootstrap  # crea o actualiza los roles y sus límites
pnpm -C database db:migrate    # aplica migraciones pendientes
pnpm typecheck
pnpm lint
pnpm test
pnpm -C backend verify
pnpm -C backend keys    # genera un par Ed25519 en base64 para el .env
pnpm -C backend dev     # API en http://localhost:3000
pnpm -C frontend start  # Expo; el emulador Android usa 10.0.2.2
pnpm db:reset           # borra el volumen y reconstruye
```

Tras `db:reset` hay que ejecutar `pnpm -C database db:bootstrap` y `pnpm -C database db:migrate`.

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
- `0003-trpc-surface.md` — superficie tRPC, cookie `httpOnly` y allowlist de
  origen. Revisado en 3: CORS con credenciales solo para orígenes de confianza.
- `0004-refresh-en-nativo.md` — SecureStore en Android, cookie en web, plugin
  bearer y política offline.
- `0005-correo-y-recuperacion.md` — Gmail SMTP, plugin `emailOTP`, código de 6
  dígitos y revocación de sesiones.
- `0006-registro-cerrado.md` — lista de correos, mensajes genéricos y rate limit.

## Bloqueado

- Nada.

## Notas abiertas

- Nombre de marca pendiente. `NexxusApp` es carpeta y `applicationId` provisional.
- `applicationId` definitivo debe verificarse antes del primer upload a Play Store,
  si algún día se publica; la distribución actual es APK sideloaded.
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
- El frontend añade Vitest en la fase 2 para la lógica de refresco y guardas; no
  se añaden tests de componentes en esta ronda.
- `EXPO_PUBLIC_API_URL` permite apuntar a otra API. En el emulador Android el
  valor por defecto es `http://10.0.2.2:3000`; en release debe ser obligatoria y
  el fallback local no puede sobrevivir al build.
- La app web de desarrollo corre en `http://localhost:8081`; debe estar en
  `TRUSTED_ORIGINS` o el navegador no recibe la cookie.
- El refresh nativo vive en `expo-secure-store` y el contexto de la API ignora
  cookies cuando llega `x-client-platform: native`.
- El correo usa Gmail SMTP en Fly.io; Railway Hobby no permite SMTP. La cuenta
  dedicada necesita 2FA y contraseña de aplicación.
- El registro está cerrado con `ALLOWED_EMAILS`; añadir un amigo exige redesplegar.
- El controlador de refresco es puro (`refresh-controller.ts`); el cliente tRPC y
  SecureStore se conectan en `refresh-session.ts`. Así se prueba sin red.
- `android.allowBackup` está desactivado y el plugin `expo-secure-store` está en
  `app.json`: un backup no restaura valores cifrados sin su clave.
- HIBP, cambio de contraseña autenticado y cierre de sesión en todos los
  dispositivos quedan en backlog.
- `ALLOWED_EMAILS` vacía en desarrollo/test abre el registro; en producción el
  arranque falla. El aviso se emite en `server.ts`, donde ya hay logger.
- Las pruebas que bloquean una IP usan `x-forwarded-for` con una IP propia para
  no contaminar a los demás archivos de test que corren en paralelo.

## Etapas

| # | Etapa | Estado |
|---|---|---|
| 0 | Documentación | Cerrada |
| 1 | Base de datos: auth | Cerrada |
| 2A | Backend: cimientos | Cerrada |
| 2B | Backend: superficie autenticada | Cerrada |
| 2C | Backend: JWT y endurecimiento | Cerrada |
| 3 | Frontend: auth | **Cerrada** |
| 3.5 | Cierre de auth | **En curso** |
| 4 | Identidad visual y rediseño de auth | Pendiente |
| 5 | Walking skeleton | Pendiente |
