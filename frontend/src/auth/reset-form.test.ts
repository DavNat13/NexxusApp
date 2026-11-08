import { describe, expect, it } from 'vitest'
import { resetFormSchema } from './reset-form'

const valid = {
  email: 'ana@example.com',
  code: '123456',
  password: 'clave-segura-123',
  confirm: 'clave-segura-123',
}

describe('resetFormSchema', () => {
  it('acepta un formulario completo', () => {
    expect(resetFormSchema.safeParse(valid).success).toBe(true)
  })

  it('exige confirmación idéntica', () => {
    const result = resetFormSchema.safeParse({ ...valid, confirm: 'otra-clave-123' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['confirm'])
  })

  it('exige un código de seis dígitos', () => {
    expect(resetFormSchema.safeParse({ ...valid, code: '12345' }).success).toBe(
      false,
    )
  })
})
