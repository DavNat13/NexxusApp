import { createHash } from 'node:crypto'

/** Hash hexadecimal de 64 caracteres, el formato que exige la auditoría. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
