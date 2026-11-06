type Listener = (token: string | null) => void

let accessToken: string | null = null
const listeners = new Set<Listener>()

/** El access token vive solo en memoria: no se persiste en el disco. */
export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  for (const listener of listeners) listener(token)
}

export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
