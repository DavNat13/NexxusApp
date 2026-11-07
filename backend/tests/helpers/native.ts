export interface AuthResult {
  user: { id: string; email: string; name: string }
  accessToken: string
  expiresAt?: number
  tokenType?: string
  refreshToken?: string
}

export const native = { 'x-client-platform': 'native' }

export function nativeHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return { ...native, ...extra }
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}
