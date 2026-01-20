import axios, { type AxiosRequestConfig, type AxiosError } from "axios";
import { authStorage } from "./auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Required for httpOnly cookies (refresh token)
});

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  googleId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface GoogleUserInfo {
  name: string;
  email: string;
  sub: string;
  picture?: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Concurrency handling: Single refresh request when multiple 401s occur
let refreshTokenPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    // Do not attempt refresh flow for auth endpoints; propagate original error
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint = ["/api/login", "/api/register", "/api/refresh", "/api/logout"].some(
      (p) => requestUrl.includes(p)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // If no refresh is in progress, start a new one
      if (!refreshTokenPromise) {
        refreshTokenPromise = (async () => {
          try {
            const refreshed = await refreshAccessToken();
            return refreshed;
          } catch (e) {
            // Refresh token failed - clear all tokens
            authStorage.clearAccessToken();
            authStorage.clearRefreshToken();

            // Dispatch event to notify AuthContext to logout (only if not already logging out)
            if (!isLoggingOut) {
              window.dispatchEvent(new CustomEvent("auth:force-logout"));
            }

            // Call logout API (ignore errors)
            logout().catch(() => {
              // Ignore logout API errors - tokens are already cleared
            });

            throw e;
          } finally {
            // Clear the promise so next 401 can trigger a new refresh
            refreshTokenPromise = null;
          }
        })();
      }

      // Wait for the ongoing refresh (or join the queue if refresh is in progress)
      return refreshTokenPromise
        .then((token) => {
          // Retry the original request with the new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api.request(originalRequest);
        })
        .catch(() => {
          // If refresh failed, reject the original request
          return Promise.reject(error);
        });
    }

    // Handle 401 on refresh endpoint itself - force logout
    // But skip if we're already logging out or if this is a logout request
    if (
      error.response?.status === 401 &&
      isAuthEndpoint &&
      requestUrl.includes("/refresh") &&
      !requestUrl.includes("/logout")
    ) {
      authStorage.clearAccessToken();
      authStorage.clearRefreshToken();

      // Dispatch event to notify AuthContext to logout (only if not already logging out)
      if (!isLoggingOut) {
        window.dispatchEvent(new CustomEvent("auth:force-logout"));
      }

      logout().catch(() => {
        // Ignore logout API errors - tokens are already cleared
      });
    }
    // Always reject with the original error so callers can read error.response.data
    return Promise.reject(error);
  }
);

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/login", credentials);
  const { accessToken, accessTokenExpiresAt } = res.data;
  // Only store access token in memory (refresh token is in httpOnly cookie)
  authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
  return res.data;
}

let isLoggingOut = false;

export async function logout(): Promise<void> {
  // Prevent multiple logout calls
  if (isLoggingOut) {
    return;
  }

  isLoggingOut = true;
  try {
    // Refresh token is in httpOnly cookie, server will clear it
    await api.post("/logout");
  } catch {
    // Ignore logout errors
  } finally {
    authStorage.clearAccessToken();
    // Refresh token cookie is cleared by server
    isLoggingOut = false;
  }
}

export async function refreshAccessToken(): Promise<string> {
  // Refresh token is in httpOnly cookie, automatically sent with request
  try {
    const res = await api.post<AuthResponse>("/refresh");
    const { accessToken, accessTokenExpiresAt } = res.data;
    authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
    return accessToken;
  } catch (error) {
    // If refresh token is invalid or expired (401), clear access token
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      authStorage.clearAccessToken();
      // Refresh token cookie will be cleared by server on next request or logout
    }
    throw error;
  }
}

export const registerUser = async (userData: RegisterUserData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/register", userData);
  return response.data;
};

export default api;

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<User>("/me");
  return res.data;
}

export interface GoogleSignInResponse extends AuthResponse {
  emailProviderConnected?: boolean;
  isNewUser?: boolean;
}

export async function googleSignIn(
  credential: string,
  userInfo: GoogleUserInfo,
  code?: string
): Promise<GoogleSignInResponse> {
  const res = await api.post<GoogleSignInResponse>("/google-signin", {
    credential,
    code, // OAuth authorization code (optional)
    name: userInfo.name,
    email: userInfo.email,
    googleId: userInfo.sub,
    avatar: userInfo.picture,
  });
  const { accessToken, accessTokenExpiresAt } = res.data;
  // Only store access token in memory (refresh token is in httpOnly cookie)
  authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
  return res.data;
}
