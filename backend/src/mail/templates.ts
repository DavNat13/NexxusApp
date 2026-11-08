export interface MailContent {
  subject: string
  text: string
  html: string
}

/** La plantilla no incluye el correo del destinatario ni enlaces. */
export function passwordResetCode(code: string, minutes = 15): MailContent {
  return {
    subject: 'Tu código para recuperar Nexxus',
    text: [
      `Tu código para restablecer la contraseña es: ${code}`,
      '',
      `Caduca en ${minutes} minutos y solo se puede usar una vez.`,
      'Si no lo pediste, ignora este correo: tu contraseña sigue igual.',
    ].join('\n'),
    html: [
      '<p>Tu código para restablecer la contraseña es:</p>',
      `<p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p>`,
      `<p>Caduca en ${minutes} minutos y solo se puede usar una vez.</p>`,
      '<p>Si no lo pediste, ignora este correo: tu contraseña sigue igual.</p>',
    ].join('\n'),
  }
}

export function passwordChangedNotice(): MailContent {
  return {
    subject: 'Tu contraseña de Nexxus cambió',
    text: [
      'La contraseña de tu cuenta se acaba de cambiar.',
      '',
      'Todas las sesiones abiertas se cerraron.',
      'Si no fuiste tú, escribe al administrador de inmediato.',
    ].join('\n'),
    html: [
      '<p>La contraseña de tu cuenta se acaba de cambiar.</p>',
      '<p>Todas las sesiones abiertas se cerraron.</p>',
      '<p>Si no fuiste tú, escribe al administrador de inmediato.</p>',
    ].join('\n'),
  }
}
