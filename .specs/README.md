# Proyecto — nombre pendiente

> El nombre de marca está pendiente. `NexxusApp` es solo el nombre de la carpeta y del `applicationId` provisional. La marca se decide antes del primer release.

## Qué es

App deportiva multifuncional, Android primero, con tres pilares:

1. **Entrenamiento** — registrar, planificar y ejecutar sesiones; estadísticas de progreso; entrenamiento inteligente (readiness, deload y sugerencia de cargas).
2. **Nutrición** — datos biométricos, cálculo de macros, registro de comidas y recuento automático con datos reales de alimentos.
3. **Actividad diaria** — pasos, rutas y mapa.

El principio de producto: **las funciones que otras apps cobran como pro, aquí son gratis**.

No es una app de gamificación. No hay rangos, XP ni monedas en el MVP.

## Por qué

IronHealth, el proyecto anterior, acumuló deuda estructural: backend simulado, seguridad cosmética, cero tests y ~20.000 líneas sin commitear. La lógica de dominio era valiosa; la arquitectura no.

Este proyecto reconstruye la base desde cero — repositorio, marca, arquitectura y backend — y **porta con tests** lo que sí valía la pena: catálogos de ejercicios, 1RM, plate math, deload, readiness, heatmap muscular y detección de PRs.

Objetivo del MVP: **poder registrar un entrenamiento completo sin señal y verlo después en otro dispositivo**.

## Módulos

### De producto

| Módulo | Qué resuelve | Versión |
|---|---|---|
| Entrenamiento | Planes, ejecución offline, historial, estadísticas | v0.1 Core |
| Entrenamiento inteligente | Readiness, deload, sugerencia de cargas | v0.2 Smart |
| Nutrición | Biometría, TDEE/macros, alimentos, comidas | v0.3 |
| Actividad | Pasos, Health Connect, rutas y mapas | v0.4 |
| IA | Cámara y generación asistida | v1.0 |

### Transversales

| Módulo | Responsabilidad |
|---|---|
| Identidad | Registro cerrado, login, sesión, recuperación de contraseña |
| Perfil | Datos del atleta, equipamiento, lesiones, ajustes |
| Sincronización | Outbox local, cursores, conflictos, idempotencia |

## Alcance del MVP (v0.1)

Dentro: auth, perfil, catálogo, planes, logger offline, historial, estadísticas básicas, sync, ajustes y APK propio entre amigos.

Fuera: nutrición, pasos, rutas, IA, social, pagos, iOS, web y gamificación. El borrado de cuenta y la ficha de datos de Play Store quedan fuera mientras la distribución sea un APK sideloaded; si se publica en Play Store, se revisan.

## Cómo trabajamos

- **Una tarea y un servicio a la vez.** No se abre la siguiente etapa hasta que la actual esté terminada, probada y documentada.
- **1 día libre por semana (~8 h).** El plan está dimensionado para eso.
- **Un resultado visible por sesión.** No se empieza una feature si la anterior no está cerrada.
- **WIP limit = 1.** Una sola feature en progreso.
- **`main` siempre verde.** Ramas cortas; merge solo con typecheck, lint y tests en verde.
- **Vertical slices.** Se termina un módulo antes de abrir el siguiente.
- **Tests primero en el dominio.** Los algoritmos se prueban antes de conectar UI.
- **`.specs/STATUS.md` es la memoria del proyecto.** Se actualiza al cerrar cada sesión.
- **Las ideas nuevas van a `.specs/backlog.md`, no al código.**

### Orden de construcción

La documentación se cierra antes de escribir código. Después se avanza por etapas, con un gate objetivo entre cada una.

1. **Documentación** — `README.md`, `stack.md`, `golden-rules.md`.
2. **Base de datos: solo autenticación** — tablas, roles, RLS, migraciones y tests de seguridad.
3. **Backend: autenticación blindada** — registro, login, refresh, logout, rate limit, bloqueo por intentos y auditoría (2A, 2B, 2C).
4. **Frontend: autenticación** — pantallas, sesión en memoria y refresco ante `401` (etapa 3).
5. **Cierre de auth** — refresh nativo en SecureStore, sesión offline, registro cerrado, recuperación por correo y endurecimientos (etapa 3.5).
6. **Identidad visual** — paleta, tipografía, componentes y rediseño de auth (etapa 4).
7. **Walking skeleton** — login → perfil → registrar serie → sync → historial (etapa 5).

Cada etapa termina con: typecheck, lint y tests en verde, y `.specs/STATUS.md` actualizado. No se toca el frontend hasta que la base de datos y el backend de auth estén en verde.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo + Expo Router + TypeScript strict |
| Estado | TanStack Query + Zustand + React Hook Form |
| Validación | Zod en todos los bordes |
| DB local | expo-sqlite + Drizzle + outbox |
| API | Fastify + tRPC + Zod |
| DB servidor | PostgreSQL + Drizzle |
| Auth | Better Auth, sesión verificada en backend |
| Correo | Gmail SMTP + nodemailer |
| Errores | Sentry |
| CI | GitHub Actions |
| Deploy | Fly.io |

Sin Redis, sin RabbitMQ, sin Kubernetes.

## Estructura

```text
NexxusApp/
├─ .specs/       # documentación y decisiones
├─ database/     # esquema Postgres, migraciones, RLS, seeds
├─ backend/      # Fastify + tRPC
├─ frontend/     # Expo
├─ shared/       # Zod y algoritmos puros
└─ infra/        # docker-compose local
```

## Seguridad desde el día 1

- La app nunca habla con la base de datos; solo con la API.
- La sesión se verifica en cada request. El `user_id` sale del token, nunca del cliente.
- RLS forzado con rol sin `BYPASSRLS`.
- El access token vive solo en memoria. El refresh va en cookie `httpOnly` en web y en `expo-secure-store` en Android; nunca en AsyncStorage.
- El registro está cerrado con lista de correos permitidos.
- Validación Zod en todos los bordes.
- Sin PIN en v0.1.
- Sin borrado de cuenta ni ficha de datos mientras la distribución sea un APK sideloaded.

## Roadmap

| Versión | Entrega | Estimación |
|---|---|---|
| v0.0 | Walking skeleton | 6-8 semanas |
| v0.1 | Core de entrenamiento | 7-9 meses |
| v0.2 | Smart training | +3-4 meses |
| v0.3 | Nutrición | +6-9 meses |
| v0.4 | Actividad | +4-6 meses |
| v1.0 | IA | I+D aparte |

Estimaciones a 8 h/semana.

## Estado

Fase 3.5: cierre de auth (refresh nativo, sesión offline, registro cerrado, recuperación y endurecimientos). Después, identidad visual y walking skeleton.

La memoria de cada sesión vivirá en `.specs/STATUS.md`.
