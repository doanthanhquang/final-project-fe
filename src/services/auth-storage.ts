// Access token stored in memory only (not persisted)
let accessTokenInMemory: string | null = null;
let accessTokenExpiry: Date | null = null;

export const authStorage = {
  getAccessToken(): string | null {
    return accessTokenInMemory;
  },
  setAccessToken(token: string | null, expiresAtIso?: string | null): void {
    accessTokenInMemory = token;
    accessTokenExpiry = expiresAtIso ? new Date(expiresAtIso) : null;
  },
  clearAccessToken(): void {
    accessTokenInMemory = null;
    accessTokenExpiry = null;
  },
  isAccessExpired(): boolean {
    if (!accessTokenExpiry) return true;
    return new Date() >= accessTokenExpiry;
  },
  // Refresh token is stored server-side only (httpOnly cookie)
  // These methods are kept for compatibility but don't actually store anything
  getRefreshToken(): string | null {
    // Refresh token is in httpOnly cookie, not accessible via JavaScript
    return null;
  },
  setRefreshToken(): void {
    // Refresh token is set by server via httpOnly cookie
    // No-op on frontend
  },
  clearRefreshToken(): void {
    // Refresh token is cleared by server when logout
    // No-op on frontend
  },
};
