import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  getStoredToken,
  isDemoModeEnabled,
  setDemoModeEnabled,
  setStoredToken,
} from '../api';
import { DEMO_USER, resetDemoSandbox } from '../api/demoSandbox';
import type { LoginRequest, UserProfile } from '../types/api';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isInitializing: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  enterDemoMode: () => UserProfile;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() =>
    isDemoModeEnabled() ? DEMO_USER : null,
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeEnabled());
  const [isInitializing, setIsInitializing] = useState<boolean>(
    () => !isDemoModeEnabled() && Boolean(getStoredToken()),
  );

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setIsInitializing(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (!cancelled) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<UserProfile> => {
    setDemoModeEnabled(false);
    setIsDemoMode(false);
    const response = await authApi.login(credentials);
    setStoredToken(response.accessToken);
    setUser(response.user);
    return response.user;
  }, []);

  const enterDemoMode = useCallback((): UserProfile => {
    resetDemoSandbox();
    setStoredToken(null);
    setDemoModeEnabled(true);
    setIsDemoMode(true);
    setUser(DEMO_USER);
    setIsInitializing(false);
    return DEMO_USER;
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setDemoModeEnabled(false);
    setIsDemoMode(false);
    resetDemoSandbox();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isDemoMode,
      isInitializing,
      login,
      enterDemoMode,
      logout,
    }),
    [user, isDemoMode, isInitializing, login, enterDemoMode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
