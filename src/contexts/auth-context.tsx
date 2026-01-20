import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
  type ReactNode,
} from "react";
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
  loginWithGoogle: (
    credential: string,
    userInfo: GoogleUserInfo,
    code?: string
  ) => Promise<{ emailProviderConnected?: boolean }>;
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
  const isLoggingOutRef = useRef(false);
  const queryClient = useQueryClient();

  const handleLogout = useCallback(async () => {
    // Prevent multiple logout calls
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;
    try {
      await apiLogout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      queryClient.clear();
      isLoggingOutRef.current = false;
    }
  }, [queryClient]);

  // Listen for force logout events (e.g., when refresh token fails)
  useEffect(() => {
    const handleForceLogout = () => {
      handleLogout();
    };

    window.addEventListener("auth:force-logout", handleForceLogout);
    return () => {
      window.removeEventListener("auth:force-logout", handleForceLogout);
    };
  }, [handleLogout]);

  // Monitor token state and sync with user state
  useEffect(() => {
    // If user is set but no tokens exist, clear user state
    // But skip if we're already logging out to prevent loops
    if (
      !isLoggingOutRef.current &&
      user &&
      !authStorage.getRefreshToken() &&
      !authStorage.getAccessToken()
    ) {
      setUser(null);
      queryClient.clear();
    }
  }, [user, queryClient]);

  // Try to restore session on mount via refresh token
  useEffect(() => {
    async function bootstrap() {
      try {
        const refreshToken = authStorage.getRefreshToken();
        if (refreshToken) {
          await refreshAccessToken();
          const me = await getCurrentUser();
          setUser(me);
        } else {
          // No refresh token - ensure clean state
          authStorage.clearAccessToken();
          setUser(null);
        }
      } catch {
        // Refresh token failed or invalid - force logout
        // Tokens are already cleared by refreshAccessToken or api interceptor
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
    mutationFn: ({
      credential,
      userInfo,
      code,
    }: {
      credential: string;
      userInfo: GoogleUserInfo;
      code?: string;
    }) => googleSignIn(credential, userInfo, code),
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
      loginWithGoogle: async (credential: string, userInfo: GoogleUserInfo, code?: string) => {
        const result = await googleLoginMutation.mutateAsync({
          credential,
          userInfo,
          code,
        });
        return { emailProviderConnected: result.emailProviderConnected };
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
