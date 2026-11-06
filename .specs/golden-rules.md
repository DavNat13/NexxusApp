# Reglas de oro

> 17 reglas no negociables. Cada una existe porque el proyecto anterior falló exactamente en eso.
> Si una regla estorba, se cambia con un ADR; no se ignora.

## Flujo de trabajo

**1. Una tarea y un servicio a la vez.**
No se abre la siguiente etapa hasta cerrar la actual con tests verdes y documentación actualizada.
*Verificación:* una sola rama y una sola feature en progreso.

**2. Nada fuera del alcance del MVP.**
Las ideas nuevas van a `.specs/backlog.md`, nunca al código.
*Verificación:* si no está en el alcance del README, no hay PR.

**3. `main` siempre verde.**
Typecheck, lint y tests antes de cada merge. Nunca se commitea roto "para arreglarlo luego".
*Verificación:* CI en verde en el último commit de `main`.

**4. Cada sesión termina con commit y `STATUS.md` actualizado.**
El estado del proyecto vive en el repo, no en la memoria ni en el chat.
*Verificación:* `STATUS.md` tiene fecha y siguiente paso.

## Datos y seguridad

**5. El cliente nunca toca la base de datos.**
La app habla solo con la API. Sin credenciales de Postgres en el bundle.
*Verificación:* ninguna cadena de conexión en `frontend/`.

**6. El `user_id` sale del token verificado, nunca del cliente.**
Un `user_id` enviado por el cliente se ignora siempre.
*Verificación:* tests de integración con token de otro usuario.

**7. RLS forzado y roles sin `BYPASSRLS`.**
`auth_service` solo toca tablas de auth; `app_user` solo tablas de negocio.
*Verificación:* los 4 tests de seguridad de la etapa 1.

**8. Cero secretos en el repo.**
`.env` ignorado y `.env.example` versionado. Nada de claves en el código ni en logs.
*Verificación:* revisión del diff y escaneo de secretos en CI.

**9. Migraciones forward-only.**
Una migración aplicada no se edita jamás; se corrige con otra.
*Verificación:* el historial de migraciones solo crece.

**10. Los sets completados son append-only.**
Nunca se actualizan ni se borran: se corrige con un registro nuevo.
*Verificación:* `workout_sets` rechaza UPDATE y DELETE a nivel de base de datos.

**11. Zod en todos los bordes.**
API, formularios, variables de entorno y respuestas externas. Lo que entra sin validar no existe.
*Verificación:* ningún handler sin esquema de entrada.

## Código

**12. TypeScript strict.**
Sin `any` sin justificación escrita. Sin `@ts-ignore` silencioso.
*Verificación:* `pnpm typecheck` sin errores.

**13. UUIDv7 generado en el cliente.**
Nunca autoincrementales: los IDs deben poder crearse sin conexión.
*Verificación:* revisión de esquema.

**14. Un bug corregido lleva un test que lo reproduce.**
Sin test, el bug no está corregido: está escondido.
*Verificación:* el PR incluye el test que falla antes del arreglo.

**15. Toda decisión importante va a un ADR.**
Las decisiones se escriben, no se recuerdan. Formato corto: contexto, decisión, consecuencias.
*Verificación:* `.specs/decisions/` contiene el ADR de cada cambio de stack.

**16. Ninguna dependencia nueva sin justificar.**
Hay que responder: qué problema resuelve, qué alternativa nativa había y cuánto mantenimiento añade.
*Verificación:* el PR explica la dependencia.

**17. Ningún archivo supera las 150 líneas.**
Si las supera, se divide por responsabilidad, no por tamaño arbitrario.

*Excepción:* los archivos generados no cuentan. Migraciones de Drizzle, `pnpm-lock.yaml`, esquemas autogenerados y snapshots de tests quedan fuera de la regla.

*Verificación:* `pnpm lint` incluye `max-lines: 150` con la lista de exclusión.

## Cómo se hace cumplir

- Las reglas 3, 12 y 17 las comprueba la máquina en CI.
- Las reglas 7 y 10 las comprueban tests de seguridad contra PostgreSQL real.
- El resto las comprueba la revisión del propio diff antes de cada commit.

Una regla que no se puede verificar no es una regla: es una intención. Por eso cada una lleva su verificación.
