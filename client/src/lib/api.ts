import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokens';

// Single Axios client with auth interceptors.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Called when refresh fails, set by AuthProvider to force logout.
let onAuthFailure: () => void = () => {};
export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn;
}

// Refresh-on-401 with a single in-flight refresh shared across concurrent requests.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        tokenStore.clear();
        onAuthFailure();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

// Normalize API error messages for display.
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } })?.error?.message ?? fallback;
  }
  return fallback;
}
