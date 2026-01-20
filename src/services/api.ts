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

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle automatic token refresh from backend
api.interceptors.response.use(
  (response) => {
    // Check if backend automatically refreshed the token
    // Axios normalizes header names to lowercase
    const newAccessToken =
      response.headers["x-new-access-token"] || response.headers["X-New-Access-Token"];
    const expiresAt =
      response.headers["x-access-token-expires-at"] ||
      response.headers["X-Access-Token-Expires-At"];

    if (newAccessToken && expiresAt) {
      // Backend automatically refreshed the token, update it
      authStorage.setAccessToken(newAccessToken, expiresAt);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint = ["/api/login", "/api/register", "/api/logout"].some((p) =>
      requestUrl.includes(p)
    );

    // Handle 401 errors
    // Backend middleware automatically refreshes expired access tokens
    // If we still get 401, it means refresh token is also expired/invalid
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // Retry the request once - backend middleware will auto-refresh if possible
      // If refresh token is expired, we'll get 401 again
      return api.request(originalRequest).catch((retryError) => {
        // If retry still fails with 401, refresh token is expired
        if (retryError.response?.status === 401) {
          authStorage.clearAccessToken();
          authStorage.clearRefreshToken();

          // Only dispatch logout event if we have a user (meaning we were authenticated)
          // Don't call logout API if we're already on login page or not authenticated
          if (!isLoggingOut) {
            window.dispatchEvent(new CustomEvent("auth:force-logout"));
          }
        }
        return Promise.reject(retryError);
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
