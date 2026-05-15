const STORAGE_KEY = 'planit_auth'

interface StoredAuth {
  token: string
  expiresAt: number  // ms since epoch
}

export function saveToken(token: string, expiresInSeconds: number): void {
  const auth: StoredAuth = {
    token,
    // Subtract 60s so we treat the token as expired slightly before Google does
    expiresAt: Date.now() + (expiresInSeconds - 60) * 1000,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const auth: StoredAuth = JSON.parse(raw)
    if (Date.now() >= auth.expiresAt) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return auth.token
  } catch {
    return null
  }
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
