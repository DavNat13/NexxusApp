# Backlog

> Ideas aparcadas a propósito. Nada de aquí se implementa hasta que el MVP esté cerrado.
> Entrar en esta lista no es aprobar la idea: es dejar de pensar en ella.

## Cómo se usa

- Una idea por entrada, con fecha.
- Si no cabe en el alcance del MVP, va aquí y se sigue trabajando.
- Al cerrar una versión se revisa la lista: se promociona, se aplaza o se borra.
- Nada se convierte en código por insistencia; se convierte por decisión escrita.

## v0.2 — Entrenamiento inteligente

- Readiness previo a la sesión con ajuste de carga sugerido.
- Deload automático cuando la tendencia de rendimiento cae.
- Sugerencia de carga basada en historial real del ejercicio.

## v0.3 — Nutrición

- Datos biométricos y cálculo de TDEE y macros.
- Catálogo de alimentos con datos reales, no estimaciones.
- Registro de comidas y recuento automático.

## v0.4 — Actividad diaria

- Pasos vía Health Connect.
- Rutas y mapa de actividad.

## v1.0 — IA

- Análisis de técnica por cámara.
- Generación asistida de planes.

## Sin versión asignada

- Rotación real del refresh token con detección de reutilización. Better Auth 1.7
  solo renueva la expiración; ver ADR 0002.
- Lista de revocación de access tokens para expulsar una cuenta antes de los 15
  minutos, si el producto lo exige.
- Tests de frontend con Jest y Testing Library: formularios, guardas de ruta y
  refresco ante `401`.
- Renovación proactiva del access token antes de que caduque, en lugar de
  esperar al `401`, si la latencia del primer reintento molesta.
- Exportación completa de datos en formato abierto.
- Modo entrenador: un usuario sigue a otro.
- Integración con wearables más allá de Health Connect.
- Widget de escritorio con la sesión del día.
- Soporte iOS.
- Versión web de solo lectura.

## Descartado

- Gamificación (rangos, XP, monedas). Decisión de producto, no de prioridad.
- PIN de acceso local. Añade fricción sin aportar seguridad real en v0.1.
- Social y feed de actividad. Fuera del alcance y del interés del producto.
