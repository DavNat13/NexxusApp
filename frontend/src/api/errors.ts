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

/** Un fallo de red no es un rechazo de credenciales: no se debe alarmar. */
export function isOfflineError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    if (error.cause instanceof TypeError) return true
    return /failed to fetch|network request failed|networkerror/i.test(
      error.message,
    )
  }

  return error instanceof TypeError
}
