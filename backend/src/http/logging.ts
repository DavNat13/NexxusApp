import type { FastifyServerOptions } from 'fastify'

/**
 * Pino nunca debe escribir credenciales ni PII. Las rutas cubren cuerpos
 * anidados (`*.email`) y los campos que viajan en la raíz del log.
 */
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  'res.headers["set-auth-token"]',
  '*.password',
  '*.token',
  '*.secret',
  '*.otp',
  '*.code',
  '*.refreshToken',
  '*.accessToken',
  '*.email',
  '*.newEmail',
  'otp',
  'email',
  'newEmail',
  'refreshToken',
  'accessToken',
]

export function loggerOptions(
  nodeEnv: string,
): FastifyServerOptions['logger'] {
  return {
    level: nodeEnv === 'test' ? 'warn' : 'info',
    redact: {
      paths: REDACT_PATHS,
      censor: '[redactado]',
    },
  }
}
