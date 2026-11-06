# ADR 0001 — Separar la auditoría de autenticación

**Fecha:** 2026-11-05
**Estado:** aceptada

## Contexto

La etapa 1 usaba una sola tabla `auth_audit_log` con un `user_id` opcional. El
login fallido no tiene usuario autenticado: no hay `user_id` que guardar. Si se
guarda el email para poder investigar, la auditoría se convierte en una segunda
base de datos de datos personales, con otro ciclo de vida y otro régimen de
acceso. Además mezclar ambos casos impide dar permisos distintos a quien
investiga un incidente y a quien escribe eventos.

## Decisión

Dos tablas con contratos distintos:

- `audit.auth_event`: eventos con actor autenticado. `user_id` obligatorio, sin
  FK, para que el histórico sobreviva al borrado de la cuenta.
- `audit.auth_attempt`: intentos sin sesión. Nunca guarda el identificador en
  claro: guarda `identifier_hash` (SHA-256 hexadecimal de 64 caracteres), de modo
  que solo se puede correlacionar, no recuperar el email.

Los contadores de bloqueo van aparte, en `auth.login_throttle`, porque son
estado mutable y se actualizan en cada intento; la auditoría es append-only y no
debe recibir `UPDATE`.

Permisos: `auth_service` es el único escritor (`INSERT`), `audit_reader` es
`NOLOGIN` y el único lector (se usa con `SET LOCAL ROLE` desde `migrator`).
`app_user` no tiene ningún permiso sobre `audit`.

Inmutabilidad en dos capas: `REVOKE` de `UPDATE`/`DELETE` y triggers de fila que
también frenan a un superusuario. `TRUNCATE` se bloquea con un trigger de
sentencia que solo cede ante `app.maintenance = 'on'`, usado exclusivamente por
el harness de tests dentro de una transacción.

## Consecuencias

- Investigar un ataque de credential stuffing no requiere leer emails en claro.
- `auth_service` no puede leer lo que escribe: si la API se compromete, no puede
  exfiltrar el histórico.
- Hay dos tablas que consultar en lugar de una; cualquier panel de auditoría
  necesita `audit_reader`.
- El hash sin sal por sí solo no resiste fuerza bruta sobre emails conocidos; se
  acepta porque la alternativa (sal por fila) impide la correlación que justifica
  la tabla. El email sigue siendo dato personal de bajo secreto.
