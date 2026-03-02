import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  position?: string;
  phone?: string;
  createdAt?: string;
  passwordLastChange?: string | null;
  role?: string | null;
  permissions?: string[];
  [key: string]: unknown;
}

// Dane tymczasowe między krokiem logowania a 2FA
export interface PendingAuth {
  email: string;
  password: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  // Dane tymczasowe dla flow 2FA
  pendingAuth: PendingAuth | null;
  // Impersonacja — dane oryginalnego admina
  impersonator: AuthUser | null;
}

export interface AuthActions {
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetAuth: () => void;
  logout: () => void;
  // Akcje dla flow 2FA
  setPendingAuth: (pending: PendingAuth | null) => void;
  clearPendingAuth: () => void;
  // Impersonacja
  setImpersonator: (impersonator: AuthUser | null) => void;
  isImpersonating: () => boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  error: null,
  pendingAuth: null,
  impersonator: null
};

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        setToken: (token) =>
          set(
            (state) => ({
              token,
              user: token ? state.user : null
            }),
            false,
            'auth/setToken'
          ),
        setUser: (user) => set({ user }, false, 'auth/setUser'),
        setLoading: (loading) => set({ loading }, false, 'auth/setLoading'),
        setError: (error) => set({ error }, false, 'auth/setError'),
        clearError: () => set({ error: null }, false, 'auth/clearError'),
        resetAuth: () => set(initialState, false, 'auth/resetAuth'),
        logout: () => set(initialState, false, 'auth/logout'),
        // Akcje dla flow 2FA
        setPendingAuth: (pendingAuth) => set({ pendingAuth }, false, 'auth/setPendingAuth'),
        clearPendingAuth: () => set({ pendingAuth: null }, false, 'auth/clearPendingAuth'),
        // Impersonacja
        setImpersonator: (impersonator) => set({ impersonator }, false, 'auth/setImpersonator'),
        isImpersonating: () => get().impersonator !== null
      }),
      {
        name: 'auth-storage',
        // Nie zapisujemy pendingAuth do localStorage (dane wrażliwe)
        partialize: (state) =>
          ({
            token: state.token,
            user: state.user,
            impersonator: state.impersonator
          }) as AuthState & AuthActions
      }
    ),
    { name: 'AuthStore' }
  )
);
