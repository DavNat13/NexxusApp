import { z } from 'zod'

/**
 * Contrato de autenticación compartido por API y app.
 * Si cambia una regla aquí, cambia en los dos lados a la vez.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El email es demasiado corto.')
  .max(254, 'El email es demasiado largo.')
  .pipe(z.email('Escribe un email válido.'))

export const passwordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres.')
  .max(128, 'La contraseña es demasiado larga.')

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(80, 'El nombre es demasiado largo.')

export const registerInput = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginInput = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña.').max(128),
})

/**
 * En nativo el refresh viaja en el cuerpo, nunca en cookie.
 * En web el campo se omite y la sesión sale de la cookie `httpOnly`.
 */
const refreshTokenInput = z.object({
  refreshToken: z.string().min(1).max(1024).optional(),
})

export const refreshInput = refreshTokenInput.default({})
export const logoutInput = refreshTokenInput.default({})

export type RegisterInput = z.infer<typeof registerInput>
export type LoginInput = z.infer<typeof loginInput>
export type RefreshInput = z.infer<typeof refreshInput>
export type LogoutInput = z.infer<typeof logoutInput>

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthPayload {
  user: AuthUser
  accessToken: string
  expiresAt: number
  tokenType: 'Bearer'
  /** Solo en nativo: valor firmado que se guarda en SecureStore. */
  refreshToken?: string
}
