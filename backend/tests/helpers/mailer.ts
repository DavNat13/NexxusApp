import type { MailMessage, Mailer } from '../../src/mail/mailer.js'

export interface FakeMailer extends Mailer {
  messages: MailMessage[]
  /** Si es `true`, `send` lanza para simular un SMTP caído. */
  fail: boolean
}

export function createFakeMailer(): FakeMailer {
  const messages: MailMessage[] = []

  const mailer: FakeMailer = {
    messages,
    fail: false,
    send(message) {
      if (mailer.fail) throw new Error('SMTP caído')
      messages.push(message)
    },
    close() {},
  }

  return mailer
}

export function codeFrom(message: MailMessage): string {
  const match = /\b(\d{6})\b/.exec(message.text)
  if (!match?.[1]) throw new Error('El correo no contiene un código de 6 dígitos')
  return match[1]
}
