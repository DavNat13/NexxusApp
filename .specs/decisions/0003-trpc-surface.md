# ADR 0003 — Superficie tRPC y transporte de la sesión

**Fecha:** 2026-11-06
**Estado:** aceptada

## Contexto

Better Auth expone por defecto `/api/auth/*`. Montarlo entero da endpoints que no
hemos validado, ni rate-limitado, ni auditado, y obliga al cliente a hablar dos
protocolos. El cliente es una sola app Expo; no hay terceros consumiendo la API.

## Decisión

- La única superficie es `/trpc` más `/health`. Nada de `/api/auth/*`.
- La API llama a `auth.api.*` en servidor. El navegador y la app nunca ven la
  forma interna de Better Auth.
- La cookie de sesión viaja `httpOnly`, `Secure` en producción y `SameSite=Lax`.
  El cliente no guarda tokens en `localStorage` ni los lee desde JavaScript.
- Toda mutación con cabecera `Origin` debe traer un origen de `TRUSTED_ORIGINS`.
  Sin `Origin` se acepta, porque el cliente nativo no la envía y la cookie no se
  adjunta sola desde otro sitio.
- Los errores de autenticación se traducen a mensajes fijos: el mensaje original
  puede revelar si un email existe.
- El `user_id` del contexto sale de la sesión verificada; el input nunca lo
  aporta.

## Consecuencias

- Hay que mantener a mano el mapeo de procedimientos; no se heredan endpoints
  nuevos de Better Auth al actualizar.
- OAuth, verificación de email o passkeys exigirán procedimientos propios y un
  ADR si cambian el modelo.
- Un cliente que no sea navegador ni app nativa necesitará política CORS
  explícita; hoy no existe y no hace falta.
- El límite de tasa por IP y por cuenta, y la escritura de auditoría, se añaden
  en la etapa 2C sobre estos mismos procedimientos.
