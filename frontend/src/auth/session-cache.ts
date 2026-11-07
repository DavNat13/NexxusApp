import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthUser } from '@nexxus/shared'

const KEY = 'nexxus.session.user'

/**
 * Solo se cachea el usuario visible. Nunca tokens ni secretos:
 * el refresh vive en SecureStore y el access token, en memoria.
 */
export async function readCachedUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return null

    const value = JSON.parse(raw) as Partial<AuthUser>
    if (
      typeof value.id !== 'string' ||
      typeof value.email !== 'string' ||
      typeof value.name !== 'string'
    ) {
      return null
    }

    return { id: value.id, email: value.email, name: value.name }
  } catch {
    return null
  }
}

export async function writeCachedUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ id: user.id, email: user.email, name: user.name }),
  )
}

export async function clearCachedUser(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
