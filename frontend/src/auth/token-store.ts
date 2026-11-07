import * as SecureStore from 'expo-secure-store'
import { isNative } from '../api/platform'

const KEY = 'nexxus.refresh_token'

/** Web no tiene SecureStore: allí el refresh es una cookie `httpOnly`. */
export async function readRefreshToken(): Promise<string | null> {
  if (!isNative) return null

  try {
    return await SecureStore.getItemAsync(KEY)
  } catch {
    return null
  }
}

export async function writeRefreshToken(token: string): Promise<void> {
  if (!isNative) return

  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

export async function clearRefreshToken(): Promise<void> {
  if (!isNative) return

  try {
    await SecureStore.deleteItemAsync(KEY)
  } catch {
    // Si el almacén ya está vacío o no disponible, no hay nada que limpiar.
  }
}
