import { z } from 'zod'

/** Registro cerrado: solo los correos de esta lista pueden crear cuenta. */
export const registrationFields = {
  ALLOWED_EMAILS: z.string().default(''),
}

export const REGISTRATION_ENV_KEYS = ['ALLOWED_EMAILS'] as const

/** Lista normalizada; el Set evita duplicados y acelera la comprobación. */
export function parseAllowedEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function validateRegistration(
  raw: string,
  nodeEnv: string,
  ctx: z.RefinementCtx,
): void {
  const emails = parseAllowedEmails(raw)

  for (const email of emails) {
    if (!z.email().safeParse(email).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['ALLOWED_EMAILS'],
        message: `correo inválido: ${email}`,
      })
    }
  }

  if (nodeEnv === 'production' && emails.size === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['ALLOWED_EMAILS'],
      message: 'no puede estar vacía en producción',
    })
  }
}
