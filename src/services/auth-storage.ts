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
  getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  },
  setRefreshToken(token: string): void {
    localStorage.setItem("refreshToken", token);
  },
  clearRefreshToken(): void {
    localStorage.removeItem("refreshToken");
  },
};
