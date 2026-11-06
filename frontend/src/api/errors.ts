import { TRPCClientError } from '@trpc/client'

/** Traduce cualquier fallo a un texto que se pueda mostrar en pantalla. */
export function errorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message || 'No se pudo completar la operación.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Algo salió mal. Inténtalo de nuevo.'
}
