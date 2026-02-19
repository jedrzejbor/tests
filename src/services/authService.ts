import { apiClient, type ApiError } from './apiClient';
import { API_ENDPOINTS } from '@/config/api';

// ============================================
// Typy dla API
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TwoFactorCredentials extends LoginCredentials {
  token: string;
}

export interface ApiUser {
  id: number;
  firstname: string;
  lastname: string;
  position: string;
  email?: string;
  password_last_change_at?: string;
  phone?: string;
  created_at: string;
  role?: string | null;
  permissions?: string[];
}

export interface LoginResponse {
  // Odpowiedź z pierwszego kroku logowania (przed 2FA)
  message?: string;
  requires_2fa?: boolean;
}

export interface TwoFactorResponse {
  user: ApiUser;
  token: string;
}

// Typ dla wewnętrznego użycia w aplikacji (znormalizowany)
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  firstname: string;
  lastname: string;
  position: string;
  phone?: string;
  createdAt: string;
  passwordLastChange?: string | null;
  role?: string | null;
  permissions?: string[];
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardSummary {
  balance: number;
  invested: number;
  documents: number;
  notifications: number;
  nextMeeting?: string;
}

export interface UpdateMePayload {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  position?: string;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export interface UpdateMeResponse {
  message?: string;
  user?: Partial<ApiUser> & { email?: string; phone?: string };
}

export type GetMeResponse = ApiUser | { user: ApiUser };

export interface RequestPasswordResetPayload {
  email: string;
}

export interface ChangePasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

// ============================================
// Helpery
// ============================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldFail = () => Math.random() < 0.12;

/**
 * Mapuje odpowiedź API użytkownika na wewnętrzny format aplikacji
 */
const mapApiUserToAuthUser = (apiUser: ApiUser, email: string): AuthUser => ({
  id: String(apiUser.id),
  name: `${apiUser.firstname} ${apiUser.lastname}`,
  email,
  firstname: apiUser.firstname,
  lastname: apiUser.lastname,
  position: apiUser.position,
  phone: apiUser.phone,
  createdAt: apiUser.created_at,
  passwordLastChange: apiUser.password_last_change_at ?? null,
  role: apiUser.role ?? null,
  permissions: apiUser.permissions ?? []
});

const extractMeUser = (response: GetMeResponse): ApiUser => {
  if ('user' in response) {
    return response.user;
  }
  return response;
};

// ============================================
// Funkcje API - Autentykacja
// ============================================

/**
 * Pierwszy krok logowania - wysyła email i hasło
 * Jeśli sukces, backend wyśle kod 2FA na email/telefon
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.LOGIN, credentials, {
      skipAuth: true
    });
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    // Błąd 401 (nieprawidłowe dane logowania)
    if (apiError.status === 401) {
      throw new Error('Nieprawidłowe hasło bądź login');
    }
    // Błąd 422 (walidacja hasła) - pokaż generyczny komunikat
    if (apiError.status === 422) {
      throw new Error('Nieprawidłowe hasło lub login');
    }
    // Błąd 429 (zbyt wiele prób)
    if (apiError.status === 429) {
      throw new Error('Za dużo prób logowania, proszę poczekać');
    }
    throw new Error(apiError.message || 'Niepoprawne dane logowania. Spróbuj ponownie.');
  }
};

/**
 * Wymuś ponowne wysłanie kodu 2FA. Wysyła `reset: true` razem z danymi logowania.
 */
export const resendTwoFactor = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const payload = { ...credentials, reset: true } as unknown as Record<string, unknown>;
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.LOGIN, payload, {
      skipAuth: true
    });
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 401) {
      throw new Error('Nieprawidłowe dane logowania');
    }
    throw new Error(apiError.message || 'Nie udało się ponownie wysłać kodu 2FA.');
  }
};

/**
 * Drugi krok logowania - weryfikacja kodu 2FA
 * Zwraca token i dane użytkownika
 */
export const verifyTwoFactor = async (credentials: TwoFactorCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<TwoFactorResponse>(API_ENDPOINTS.LOGIN, credentials, {
      skipAuth: true
    });

    return {
      token: response.token,
      user: mapApiUserToAuthUser(response.user, credentials.email)
    };
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Nieprawidłowy kod autoryzacji. Spróbuj ponownie.');
  }
};

/**
 * Wylogowanie użytkownika
 * Wysyła Bearer token do backendu aby go unieważnić
 * Zwraca pustą odpowiedź 204 No Content
 */
export const logout = async (): Promise<void> => {
  try {
    // POST /api/logout z Bearer token w headerze
    // Backend zwraca 204 No Content
    await apiClient.post<void>(API_ENDPOINTS.LOGOUT);
  } catch (error) {
    const apiError = error as ApiError;
    // Nawet jeśli backend zwróci błąd, i tak wyczyścimy lokalny token
    console.error('Logout error:', apiError.message);
    throw new Error(apiError.message || 'Nie udało się wylogować.');
  }
};

/**
 * Aktualizuje dane zalogowanego użytkownika lub zmienia hasło.
 * Przyjmuje dowolny obiekt z polami, które mają zostać zaktualizowane
 * (np. { firstname, lastname, email, phone } lub { current_password, password, password_confirmation }).
 */
export const updateMe = async (payload: UpdateMePayload): Promise<UpdateMeResponse> => {
  try {
    const response = await apiClient.post<UpdateMeResponse>(API_ENDPOINTS.ME, payload);
    return response;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Błąd podczas aktualizacji danych użytkownika.');
  }
};

/**
 * Pobiera dane zalogowanego użytkownika (GET /api/me)
 */
export const getMe = async (): Promise<AuthUser> => {
  try {
    const response = await apiClient.get<GetMeResponse>(API_ENDPOINTS.ME);
    const apiUser = extractMeUser(response);
    const email = apiUser.email ?? '';
    return mapApiUserToAuthUser(apiUser, email);
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Nie udało się pobrać danych użytkownika.');
  }
};

/**
 * Żądanie resetu hasła - wysyła email z linkiem do resetu
 * Zwraca 204 No Content (void)
 */
export const requestPasswordReset = async (payload: RequestPasswordResetPayload): Promise<void> => {
  try {
    await apiClient.post<void>(API_ENDPOINTS.PASSWORD_REQUEST, payload, {
      skipAuth: true
    });
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Nie udało się wysłać żądania resetu hasła.');
  }
};

/**
 * Ustawienie nowego hasła po resecie
 * Wymaga tokena z maila oraz nowego hasła
 * Zwraca 204 No Content (void)
 */
export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  try {
    await apiClient.post<void>(API_ENDPOINTS.PASSWORD_CHANGE, payload, {
      skipAuth: true
    });
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Nie udało się zmienić hasła. Spróbuj ponownie.');
  }
};

// ============================================
// Mock funkcje (do usunięcia po pełnej integracji)
// ============================================

export const mockLogin = async (email: string, password: string): Promise<AuthResponse> => {
  await delay(900);

  if (shouldFail() || !password) {
    throw new Error('Niepoprawne dane logowania. Spróbuj ponownie.');
  }

  return {
    token: 'mock-token-123',
    user: {
      id: 'user-1',
      name: email.includes('anna') ? 'Anna Kowalska' : 'Alicja Nowak',
      email,
      firstname: email.includes('anna') ? 'Anna' : 'Alicja',
      lastname: email.includes('anna') ? 'Kowalska' : 'Nowak',
      position: 'Developer',
      createdAt: new Date().toISOString()
    }
  };
};

export const mockRequestPasswordReset = async (email: string): Promise<{ message: string }> => {
  await delay(800);

  if (shouldFail()) {
    throw new Error('Nie udało się wysłać kodu. Spróbuj ponownie za chwilę.');
  }

  return { message: `Wysłaliśmy instrukcje resetu na adres ${email}` };
};

export const mockCompletePasswordReset = async (code: string): Promise<{ message: string }> => {
  await delay(850);

  if (!code || shouldFail()) {
    throw new Error('Kod resetujący jest nieprawidłowy lub wygasł.');
  }

  return { message: 'Hasło zostało zaktualizowane' };
};

export const mockDashboardSummary = async (): Promise<DashboardSummary> => {
  await delay(650);

  return {
    balance: 348210.45,
    invested: 182400,
    documents: 12,
    notifications: 3,
    nextMeeting: '12 grudnia, 10:30'
  };
};

// Re-eksportuj typ błędu API
export type { ApiError };
