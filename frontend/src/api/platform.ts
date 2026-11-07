import { Platform } from 'react-native'

/** La web de desarrollo usa cookie; Android usa SecureStore. */
export const isNative = Platform.OS !== 'web'

export function platformHeaders(): Record<string, string> {
  return isNative ? { 'x-client-platform': 'native' } : {}
}

/** En nativo no se envían ni aceptan cookies de sesión. */
export const requestCredentials: RequestCredentials = isNative ? 'omit' : 'include'
