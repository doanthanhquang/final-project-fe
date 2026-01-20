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
  const userRef = useRef<User | null>(null);
  const queryClient = useQueryClient();

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleLogout = useCallback(async () => {
    // Prevent multiple logout calls
    if (isLoggingOutRef.current) {
      return;
    }

    isLoggingOutRef.current = true;

    // Only call logout API if we have a user (meaning we were authenticated)
    const hadUser = !!userRef.current;

    try {
      if (hadUser) {
        await apiLogout();
      }
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
    if (isLoggingOutRef.current && user) {
      setUser(null);
      queryClient.clear();
    }
  }, [user, queryClient]);

  // Backend middleware will automatically restore session from refresh token cookie if needed
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        // Always call /me endpoint to check session
        const me = await getCurrentUser();
        if (isMounted) {
          setUser(me);
        }
      } catch {
        // Session invalid or expired - clear state
        if (isMounted) {
          setUser(null);
          authStorage.clearAccessToken();
          queryClient.clear();
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }
    bootstrap();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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
