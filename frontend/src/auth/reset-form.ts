import { z } from 'zod'
import { resetPasswordInput } from '@nexxus/shared'

/** Confirmación solo de la app: la API no la recibe. */
export const resetFormSchema = resetPasswordInput
  .extend({
    confirm: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden.',
  })

export type ResetFormInput = z.infer<typeof resetFormSchema>
