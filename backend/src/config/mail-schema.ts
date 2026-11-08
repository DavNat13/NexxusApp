import { z } from 'zod'

/** SMTP de Gmail: 465 con SSL, 587 con STARTTLS. */
export const mailFields = {
  SMTP_HOST: z.string().trim().default(''),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .refine((port) => port === 465 || port === 587, 'debe ser 465 o 587')
    .default(465),
  SMTP_USER: z.string().trim().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().trim().default(''),
}

export const MAIL_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
] as const

export interface MailEnv {
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_USER: string
  SMTP_PASS: string
  MAIL_FROM: string
}

export interface MailSettings {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const REQUIRED: (keyof MailEnv)[] = [
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
]

function isConfigured(env: MailEnv): boolean {
  return Boolean(
    env.SMTP_HOST || env.SMTP_USER || env.SMTP_PASS || env.MAIL_FROM,
  )
}

function addressOf(from: string): string {
  const match = /^[^<>]*<([^<>]+)>$/.exec(from)
  return (match?.[1] ?? from).trim()
}

/** En producción no hay correo opcional; en desarrollo una lista vacía lo desactiva. */
export function validateMail(
  env: MailEnv,
  nodeEnv: string,
  ctx: z.RefinementCtx,
): void {
  if (nodeEnv !== 'production' && !isConfigured(env)) return

  for (const key of REQUIRED) {
    if (!String(env[key]).trim()) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'es obligatorio para enviar correo',
      })
    }
  }

  if (env.MAIL_FROM && !z.email().safeParse(addressOf(env.MAIL_FROM)).success) {
    ctx.addIssue({
      code: 'custom',
      path: ['MAIL_FROM'],
      message: 'no contiene una dirección válida',
    })
  }
}

export function parseMailSettings(env: MailEnv): MailSettings | null {
  if (!env.SMTP_HOST) return null

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  }
}
