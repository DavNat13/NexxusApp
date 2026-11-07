# ADR 0006 — Registro cerrado

**Fecha:** 2026-11-07
**Estado:** aceptada

## Contexto

La API es pública aunque el APK se reparta entre amigos. Hoy cualquiera que
descubra la URL puede crear una cuenta. Verificar emails añade infraestructura y
fricción para un grupo pequeño; cerrar el registro es más barato y más seguro.

## Decisión

- **Lista de correos permitidos** en `ALLOWED_EMAILS` (separada por comas,
  normalizada a minúsculas). Añadir a un amigo exige redesplegar; es aceptable
  para un grupo pequeño.
- La comprobación ocurre en el servidor antes de llamar a Better Auth. El
  cliente no decide nada.
- El error es siempre el mismo que un registro fallido: no se revela si el
  correo existe, si no está permitido o si hubo un error interno.
- Rate limit por IP (10 fallos/15 min, bloqueo 15 min) para frenar el escaneo de
  correos. Se reinicia al registrar con éxito.
- Los rechazos se auditan en `audit.auth_attempt` con el hash del correo y el
  motivo real (`not_allowed`, `locked`).
- En producción `ALLOWED_EMAILS` no puede estar vacío. En desarrollo/test puede
  estar vacío para facilitar pruebas, con aviso en el arranque.

## Alternativa descartada

Código de invitación de un solo uso: no exige redesplegar, pero necesita tabla,
migración, limpieza de códigos usados y más superficie. Queda en `backlog.md`
para si el grupo crece.

## Consecuencias

- Cada alta nueva es un pequeño despliegue. A cambio, no hay registro abierto.
- La lista es un secreto operativo menor; no se registra en logs ni se expone en
  la API.
- Si se invita por código en el futuro, la lista se sustituye sin cambiar la
  respuesta genérica ni la auditoría.
