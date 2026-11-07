# ADR 0004 — Refresh en nativo y sesión offline

**Fecha:** 2026-11-07
**Estado:** aceptada

## Contexto

Hasta la etapa 3 el refresh era una cookie `httpOnly` gestionada por el almacén
nativo de React Native. Funciona, pero el cliente no puede leerla, borrarla ni
saber si existe sin una petición de red. Además, una cookie antigua puede
sobrevivir a un logout hecho sin conexión y las guardas de ruta dependen hoy de
`me`, una query de red: sin red, la app expulsa al usuario al login.

El producto es offline-first. Arrancar sin conexión con una sesión previa no
puede significar perder la pantalla.

## Decisión

- **Web:** se mantiene la cookie `httpOnly`, `Secure` en producción y
  `SameSite=Lax`.
- **Android:** el refresh token se guarda en `expo-secure-store`. No se emite
  cookie en nativo y el contexto de la API ignora cookies cuando la petición se
  identifica como nativa.
- El cliente envía la cabecera `x-client-platform: native`. Sin esa cabecera se
  asume web. La web de desarrollo es la única superficie web; si algún día se
  publica una web real, habrá que añadir una prueba de cliente nativo.
- Better Auth usa el plugin `bearer` con `requireSignature: true`. El valor que
  se guarda es el token firmado que devuelve `set-auth-token`; no se acepta el
  token opaco crudo ni un JWT como refresh.
- El access token JWT sigue solo en memoria. `AsyncStorage` guarda únicamente
  el usuario cacheado (`id`, `name`, `email`) y una pista de sesión; nunca
  tokens ni secretos.
- El cliente distingue tres resultados al refrescar:
  - `refreshed`: hay token nuevo.
  - `rejected`: el servidor rechazó el refresh; se limpia la sesión.
  - `offline`: fallo de red; se conserva la sesión y se muestra el estado
    offline.
- Las guardas de ruta usan `checking | authenticated | anonymous`. Solo
  `anonymous` redirige a login. Con `offline` y usuario cacheado, la app sigue
  abierta.
- Un contador de época invalida cualquier refresh que termine después de un
  logout. Un `401` durante el logout no puede resucitar la sesión.
- El logout nativo envía el refresh token al servidor para revocar la sesión.
  Si no hay red, limpia igualmente SecureStore y la caché; la sesión remota
  caducará por expiración.

## Consecuencias

- `register`, `login`, `refresh` y `logout` tienen dos caminos: cookie en web y
  token explícito en nativo. Los tests cubren ambos.
- El contexto nativo no consulta la cookie, así que una cookie de una versión
  anterior no autentica.
- SecureStore no existe en web: el módulo de tokens es no-op allí.
- `android.allowBackup` se desactiva (o se excluye SecureStore) para no restaurar
  valores cifrados sin su clave.
- La web de desarrollo puede leer el refresh token si un XSS llama a los
  procedimientos nativos; se acepta porque no es una superficie de producción.
- El coste es mayor que dejar la cookie: dos caminos, más tests y un ADR. Se
  acepta porque el producto es offline-first y el logout debe ser controlable.
