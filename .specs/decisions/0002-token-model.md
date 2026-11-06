# ADR 0002 — Modelo híbrido de tokens

**Fecha:** 2026-11-05
**Estado:** aceptada

## Contexto

Hay que elegir entre dos extremos:

1. **Sesión opaca** (lo que Better Auth da por defecto). Cada petición consulta la
   base de datos. Revocar es inmediato, pero se paga una query por request y el
   token no lleva identidad verificable sin red.
2. **JWT puro**. Verificación local y sin estado, pero revocar antes del
   vencimiento exige una lista de revocación, que es volver a consultar la base de
   datos y reintroduce el problema con más piezas.

El requisito del usuario es explícito: tokens firmados. El requisito del producto
es poder cerrar sesión de verdad y expulsar una cuenta comprometida.

## Decisión

Modelo híbrido:

- **Access token JWT** firmado con EdDSA (Ed25519), 15 minutos de vida. Se valida
  el algoritmo de forma fija (nunca se lee `alg` del token para elegir el
  verificador), más `iss`, `aud`, `exp`, `iat` y `kid`. Sin `kid` conocido o con
  algoritmo distinto, se rechaza.
- **Refresh token opaco** de Better Auth, 14 días, con renovación deslizante de
  la expiración y `updateAge` de 24 h. Es el único que consulta la base de datos
  y el que permite revocar.

El access token no se guarda en la base de datos. El refresh viaja en cookie
`httpOnly`, `Secure` y `SameSite=Lax`; el access token vive en memoria del
cliente y nunca en `localStorage`.

## Consecuencias

- Una sesión revocada sigue teniendo acceso como máximo 15 minutos. Se acepta y
  queda escrito aquí: es el precio de no consultar la base de datos en cada
  request.
- Rotar la clave de firma exige publicar el nuevo `kid` antes de firmar con él y
  mantener el anterior mientras vivan los tokens emitidos.
- El cliente necesita lógica de refresco al recibir `401`, con una sola petición
  de refresh en vuelo para no renovar dos veces en paralelo.
- La verificación de firma es local: si el proceso no puede leer la base de datos,
  sigue autenticando durante 15 minutos. El refresh fallará y la sesión morirá.
- Este ADR se revisa si el producto exige revocación instantánea; entonces habrá
  que añadir una lista de revocación con TTL de 15 minutos.

## Revisión 2026-11-06 (etapa 2C)

Implementado así:

- Firma y verificación con `jose` en lugar de construir JWT a mano. Justificación
  de la dependencia (regla 16): implementar la codificación, la firma Ed25519 y la
  validación de claims a mano es fácil de equivocar y difícil de auditar; `jose`
  no arrastra dependencias transitivas y permite fijar `algorithms: ['EdDSA']`.
- Par de claves en `JWT_PRIVATE_KEY_B64` / `JWT_PUBLIC_KEY_B64` (PEM en base64) y
  un único `JWT_KID` activo. Al arrancar se comprueba que las dos claves son
  Ed25519 y que la pública corresponde a la privada. Sin claves válidas, la API no
  arranca.
- Los procedimientos `register`, `login` y `refresh` devuelven `accessToken`,
  `expiresAt` y `tokenType: "Bearer"`. `me` acepta la cookie o el `Bearer`.
- Un `Authorization` inválido no cae de vuelta a la cookie: la petición queda sin
  identidad. Evita que un token caducado siga sirviendo por la puerta de atrás.

**Corrección sobre la rotación:** Better Auth 1.7 no rota el valor del token de
sesión; renueva su expiración (`updateAge`). La rotación real con detección de
reutilización exige reemitir y revocar sesiones, y no se implementa en el MVP.
Queda en `.specs/backlog.md`. La ventana de revocación sigue siendo de 15 minutos
para el access token y de 14 días para el refresh, con revocación inmediata de la
sesión opaca en la base de datos.
