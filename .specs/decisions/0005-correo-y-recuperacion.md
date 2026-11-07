# ADR 0005 — Correo y recuperación de contraseña

**Fecha:** 2026-11-07
**Estado:** aceptada

## Contexto

La app se distribuye como APK propio entre amigos. No hay Play Store, así que no
hay borrado de cuenta obligatorio ni ficha de datos. Sí hace falta que un amigo
que olvide su contraseña pueda recuperarla sin que el desarrollador toque la
base de datos.

Un enlace `https` no abre la app sin App Links verificados y un esquema propio
no siempre es pulsable en Gmail. Un código de 6 dígitos escrito dentro de la app
es la opción más simple y fiable para este caso.

## Decisión

- **SMTP:** Gmail con una cuenta dedicada, verificación en dos pasos y
  contraseña de aplicación. Host `smtp.gmail.com`, puerto 465 (SSL) o 587
  (STARTTLS). `nodemailer` como cliente; abrir sockets SMTP a mano no es
  razonable.
- **Hosting:** Fly.io, que permite SMTP saliente en 465/587. Railway solo lo
  permite en Pro o superior; si se cambia de hosting, se revisa este ADR.
- **Plugin:** `emailOTP` de Better Auth 1.7.17.
  - `requestPasswordResetEmailOTP` para solicitar el código.
  - `resetPasswordEmailOTP` para fijar la contraseña.
  - `forgetPasswordEmailOTP` está deprecado y no se usa.
- **Opciones:** código de 6 dígitos, `expiresIn: 900` (15 min),
  `allowedAttempts: 3`, `storeOTP: 'hashed'`, `disableSignUp: true` y
  `resendStrategy: 'rotate'`. Un código nuevo invalida el anterior.
- **Revocación:** `emailAndPassword.revokeSessionsOnPasswordReset: true`.
  Better Auth revoca todas las sesiones en la misma transacción del cambio.
  `onPasswordReset` envía el aviso "tu contraseña cambió".
- **Respuesta:** el endpoint de solicitud responde siempre `{ ok: true }`,
  exista o no la cuenta. El de reset responde con un mensaje genérico.
- **Envío no bloqueante:** el correo se lanza en segundo plano y los errores se
  registran sin correo ni código. La respuesta no espera al SMTP.
- **Límites:** rate limit propio por correo e IP en solicitud y verificación,
  además de los 3 intentos del código. El `rateLimit` del plugin no se usa
  porque Better Auth tiene el rate limit global desactivado.
- **Auditoría:** `auth_attempt` para solicitudes e intentos fallidos (hash del
  correo) y `auth_event` para el reset correcto. Nunca correo ni código.
- **Contraseña:** se valida con el mismo `passwordSchema` compartido del
  registro (12–128).
- **Verificación de email:** innecesaria con registro cerrado. El reset marca
  `emailVerified` como efecto del plugin.

## Consecuencias

- Hay que configurar `SMTP_*` y `MAIL_FROM`; en producción la API no arranca sin
  ellos.
- Gmail limita el envío (del orden de 500 mensajes/día en cuenta personal, menos
  por SMTP según la fuente). Para un grupo de amigos sobra.
- Si se cambia a Railway Hobby, habrá que usar un servicio transaccional por
  HTTPS (Resend, Brevo) y revisar este ADR.
- El flujo depende de que el correo del registro sea real. Con allowlist se
  asume; si se invita por código, conviene verificar el correo en el onboarding.
- `nodemailer` entra como dependencia justificada por la regla 16.
