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
- **Refresh token opaco** de Better Auth, 14 días, con rotación y
  `updateAge` de 24 h. Es el único que consulta la base de datos y el que permite
  revocar.

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
  de refresh en vuelo para no rotar el token dos veces en paralelo.
- La verificación de firma es local: si el proceso no puede leer la base de datos,
  sigue autenticando durante 15 minutos. El refresh fallará y la sesión morirá.
- Este ADR se revisa si el producto exige revocación instantánea; entonces habrá
  que añadir una lista de revocación con TTL de 15 minutos.
