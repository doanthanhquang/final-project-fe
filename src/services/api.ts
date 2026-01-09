import axios, { type AxiosRequestConfig, type AxiosError } from "axios";
import { authStorage } from "./auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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

let isRefreshing = false;
let pendingRequestsQueue: Array<(token: string | null) => void> = [];

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
    const isAuthEndpoint = [
      "/api/login",
      "/api/register",
      "/api/refresh",
      "/api/logout",
    ].some((p) => requestUrl.includes(p));

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshed = await refreshAccessToken();
          pendingRequestsQueue.forEach((cb) => cb(refreshed));
          pendingRequestsQueue = [];
        } catch (e) {
          pendingRequestsQueue = [];
          await logout();
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        pendingRequestsQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(api.request(originalRequest));
        });
      });
    }
    // Always reject with the original error so callers can read error.response.data
    return Promise.reject(error);
  }
);

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/login", credentials);
  const { accessToken, accessTokenExpiresAt, refreshToken } = res.data;
  authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
  authStorage.setRefreshToken(refreshToken);
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/logout", {
      refreshToken: authStorage.getRefreshToken(),
    });
  } catch {
    // Ignore logout errors
  }
  authStorage.clearAccessToken();
  authStorage.clearRefreshToken();
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) throw new Error("Missing refresh token");
  const res = await api.post<AuthResponse>("/api/refresh", { refreshToken });
  const { accessToken, accessTokenExpiresAt } = res.data;
  authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
  return accessToken;
}

export const registerUser = async (userData: RegisterUserData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/api/register", userData);
  return response.data;
};

export default api;

export async function getCurrentUser(): Promise<User> {
  const res = await api.get<User>("/api/me");
  return res.data;
}

export async function googleSignIn(credential: string, userInfo: GoogleUserInfo): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/google-signin", {
    credential,
    name: userInfo.name,
    email: userInfo.email,
    googleId: userInfo.sub,
    avatar: userInfo.picture,
  });
  const { accessToken, accessTokenExpiresAt, refreshToken } = res.data;
  authStorage.setAccessToken(accessToken, accessTokenExpiresAt);
  authStorage.setRefreshToken(refreshToken);
  return res.data;
}