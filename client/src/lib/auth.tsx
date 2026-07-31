import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthFailureHandler } from './api';
import { tokenStore } from './tokens';
import type { AuthResponse, Role, User } from '../types';

const ROLE_RANK: Record<Role, number> = { MEMBER: 1, LIBRARIAN: 2, ADMIN: 3 };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    identifier?: string;
    password: string;
    phone?: string;
    membershipType?: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
  hasRole: (min: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: if we have a token, fetch the current user.
  useEffect(() => {
    setAuthFailureHandler(() => {
      tokenStore.clear();
      setUser(null);
    });

    const token = tokenStore.getAccess();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>('/users/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setUser,
      hasRole: (min) => (user ? ROLE_RANK[user.role] >= ROLE_RANK[min] : false),
      async login(identifier, password) {
        const { data } = await api.post<AuthResponse>('/auth/login', { identifier, password });
        tokenStore.set(data.accessToken, data.refreshToken);
        setUser(data.user);
      },
      async register(input) {
        const { data } = await api.post<AuthResponse>('/auth/register', input);
        tokenStore.set(data.accessToken, data.refreshToken);
        setUser(data.user);
      },
      logout() {
        tokenStore.clear();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
