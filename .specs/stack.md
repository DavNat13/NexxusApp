# Stack técnico

> Decisiones cerradas. Cambiar cualquiera de ellas requiere un ADR en `.specs/decisions/`.

## Principios de elección

- Un solo desarrollador con 8 h/semana: se elige lo que reduce mantenimiento, no lo que impresiona.
- Tipos de extremo a extremo: si el compilador puede detectarlo, no llega a producción.
- Offline-first real: la app debe funcionar sin red, no "casi siempre".
- Sin infraestructura que no se use. Cada pieza debe justificar su coste operativo.

## Resumen

| Capa | Elección | Alternativa descartada |
|---|---|---|
| Mobile | Expo + Expo Router | React Native CLI, Flutter |
| Lenguaje | TypeScript strict | JavaScript |
| Estado servidor | TanStack Query | SWR, Redux Toolkit Query |
| Estado local | Zustand | Redux, Context |
| Formularios | React Hook Form + Zod | Formik |
| DB local | expo-sqlite + Drizzle | WatermelonDB, Realm |
| Sync | Outbox propio | PowerSync, Replicache |
| API | Fastify + tRPC | NestJS + REST, GraphQL |
| Validación | Zod | Yup, io-ts |
| DB servidor | PostgreSQL + Drizzle | MySQL, Prisma |
| Auth | **Better Auth** | Supabase Auth, auth propio |
| Correo | Gmail SMTP + nodemailer | Resend, Brevo |
| Errores | Sentry | Bugsnag |
| Logs | Pino | Winston |
| CI | GitHub Actions | GitLab CI |
| Deploy API | Fly.io | Railway, AWS, Vercel |
| Monorepo | pnpm workspaces + Turborepo | Nx, npm workspaces |

## Mobile

- Expo en la última versión estable, fijada en `package.json` al crear el proyecto.
- Expo Router para navegación por archivos y deep links.
- TypeScript strict, sin excepciones ni `any` sin justificación escrita.
- Sin llamadas a LLM desde el cliente: todo pasa por el backend.
- El access token JWT vive solo en memoria. En web el refresh es una cookie `httpOnly`; en Android es un token firmado guardado en `expo-secure-store`. Ningún token se guarda en AsyncStorage.
- Cliente tRPC tipado con `@trpc/react-query`; validación de formularios con los esquemas Zod de `@nexxus/shared`.
- La app debe arrancar sin red con una sesión previa: las guardas usan `checking | authenticated | anonymous` y no redirigen a login por un fallo de red.

## Datos

- **Local:** `expo-sqlite` + Drizzle. Migraciones versionadas.
- **Servidor:** PostgreSQL + Drizzle. Migraciones forward-only.
- **Sync:** outbox con `idempotency_key`; pull por cursor `updated_at`.
- IDs `uuid` v7 generados en el cliente, nunca autoincrementales.
- `created_at`, `updated_at` y `deleted_at` (soft delete) en tablas de usuario.
- Pesos en kg en la base de datos; la conversión ocurre solo en la UI.

## Autenticación

Better Auth, self-hosted, con el adaptador de Drizzle sobre nuestro PostgreSQL.

- Las tablas de auth (`user`, `session`, `account`, `verification`) viven en nuestra base de datos, no en un servicio externo.
- Better Auth aporta hash de contraseñas, gestión de sesiones, verificación de email, recuperación y 2FA. No reimplementamos criptografía.
- La API emite un JWT de acceso EdDSA de 15 min con `jose`; el refresh es la sesión opaca de Better Auth. La API verifica la identidad en cada request; el `user_id` sale del token, nunca del cliente.
- El registro está cerrado con una lista de correos (`ALLOWED_EMAILS`). La recuperación usa el plugin `emailOTP` con código de 6 dígitos y Gmail SMTP.
- Better Auth 1.7 no rota el valor del refresh token, solo renueva su expiración. La rotación real está en el backlog.
- Dos roles de base de datos, con superficies separadas:
  - `auth_service`: solo tablas de auth. Lo usan registro, login, refresh y logout.
  - `app_user`: tablas de negocio con RLS por `app.user_id`.
- Ningún rol tiene `BYPASSRLS`.

## API

- Fastify + tRPC + Zod.
- Un solo proceso. Sin microservicios.
- Rate limit en los endpoints de auth; body limit global.
- Logs estructurados con Pino, sin PII.
- Errores de auth genéricos hacia el cliente; el detalle va al log.
- Detrás de un proxy solo se confía en saltos de loopback o red privada
  (`TRUST_PROXY_HOPS`, por defecto 1). Una petición directa desde Internet no
  puede elegir su IP con `X-Forwarded-For`.

## Despliegue y release

- La API se despliega en Fly.io. El proceso recibe tráfico del proxy interno;
  `TRUST_PROXY_HOPS` cuenta saltos de confianza y nunca se confía en la cadena
  completa.
- `SESSION_ABSOLUTE_MAX_SECONDS` (90 días) limita la vida total de una sesión
  aunque se refresque. Al superarlo, el refresh revoca la sesión y devuelve 401.
- El APK de release exige `EXPO_PUBLIC_API_URL` con `https://`; si falta o usa
  HTTP, la app falla al arrancar con un mensaje claro. `usesCleartextTraffic`
  queda desactivado con `expo-build-properties`; el HTTP local solo existe en
  Expo Go/desarrollo.
- La keystore de firma se guarda fuera del repo y se conserva. Sin la misma
  keystore, una actualización obliga a desinstalar y perder los datos locales.

## Testing

- **Unitario y dominio:** Vitest.
- **Integración backend:** Vitest contra PostgreSQL real vía `docker-compose`.
- **Seguridad de datos:** tests SQL que se conectan como `app_user` y verifican RLS.
- **Lógica de frontend:** Vitest para módulos puros (refresco, estados de sesión, validaciones).
- **Componentes:** React Native Testing Library (backlog; no en esta ronda).
- **E2E (opcional en v0.1):** Maestro.

## CI

- `pnpm typecheck`, `pnpm lint` y `pnpm test` en cada push.
- PostgreSQL como servicio para los tests de integración.
- Sin deploy si algo falla.

## Lo que NO usamos

- Redis, RabbitMQ, Kubernetes, microservicios.
- Firebase Firestore.
- WatermelonDB.
- Prisma y Drizzle a la vez.
- Llamadas a IA desde el cliente.
- Docker en producción más allá de un contenedor.

## Convenciones

- Código en inglés; documentación y UI en español.
- Tablas en `snake_case` plural; columnas en `snake_case`.
- Fechas en UTC ISO-8601.
- Commits convencionales: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Ningún archivo supera las 150 líneas, salvo los generados (ver `golden-rules.md`).
