import { createContext, useContext, useEffect, useMemo, useCallback, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStorage } from "@/services/auth-storage";
import {
  getCurrentUser,
  loginUser,
  logout as apiLogout,
  refreshAccessToken,
  googleSignIn,
  type User,
  type LoginCredentials,
  type GoogleUserInfo,
} from "@/services/api";

interface AuthContextType {
  user: User | null;
  initializing: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  loginWithGoogle: (credential: string, userInfo: GoogleUserInfo) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Try to restore session on mount via refresh token
  useEffect(() => {
    async function bootstrap() {
      try {
        if (authStorage.getRefreshToken()) {
          await refreshAccessToken();
          const me = await getCurrentUser();
          setUser(me);
        }
      } catch {
        await handleLogout();
      } finally {
        setInitializing(false);
      }
    }
    bootstrap();
  }, [handleLogout]);

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async () => {
      const me = await getCurrentUser();
      setUser(me);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: ({ credential, userInfo }: { credential: string; userInfo: GoogleUserInfo }) =>
      googleSignIn(credential, userInfo),
    onSuccess: async () => {
      const me = await getCurrentUser();
      setUser(me);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      initializing,
      login: async (data: LoginCredentials) => {
        await loginMutation.mutateAsync(data);
      },
      loginWithGoogle: async (credential: string, userInfo: GoogleUserInfo) => {
        await googleLoginMutation.mutateAsync({ credential, userInfo });
      },
      logout: handleLogout,
      isAuthenticated: !!user,
    }),
    [user, initializing, loginMutation, googleLoginMutation, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

