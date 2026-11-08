import { createTransport } from 'nodemailer'
import type { FastifyBaseLogger } from 'fastify'
import type { MailSettings } from '../config/mail-schema.js'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  /** Encola el envío: nunca bloquea ni lanza hacia quien llama. */
  send(message: MailMessage): void
  close(): void
}

function failureCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') return code
  }

  return 'unknown'
}

/**
 * Sin SMTP (`null`) el flujo de recuperación sigue respondiendo igual, pero no
 * envía nada. Los errores se registran sin correo, código ni respuesta SMTP.
 */
export function createMailer(
  settings: MailSettings | null,
  log: FastifyBaseLogger,
): Mailer | null {
  if (!settings) return null

  const transport = createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: settings.port === 587,
    auth: { user: settings.user, pass: settings.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: false,
    debug: false,
  })

  return {
    send(message) {
      void transport
        .sendMail({ from: settings.from, ...message })
        .catch((error: unknown) => {
          log.warn({ smtpCode: failureCode(error) }, 'no se pudo enviar el correo')
        })
    },
    close() {
      transport.close()
    },
  }
}
