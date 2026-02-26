import { apiClient, type ApiError } from './apiClient';
import { API_ENDPOINTS } from '@/config/api';
import type { ApiUser } from './authService';

// ============================================
// Typy
// ============================================

export interface ImpersonateResponse {
  requested_id: number;
  persona: {
    user: ApiUser;
  };
  impersonator: {
    user: ApiUser;
  };
  token: string;
}

export interface LeaveImpersonateResponse {
  message: string;
  token: string;
}

// ============================================
// Funkcje API
// ============================================

/**
 * Rozpocznij impersonację wskazanego użytkownika.
 * Backend wymieni token i zwróci dane persona + impersonator.
 */
export const impersonateUser = async (userId: string | number): Promise<ImpersonateResponse> => {
  try {
    return await apiClient.post<ImpersonateResponse>(`${API_ENDPOINTS.IMPERSONATE}/${userId}`);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 400) {
      throw new Error('Nie można podszywać się pod tego użytkownika.');
    }
    throw new Error(apiError.message || 'Nie udało się rozpocząć impersonacji.');
  }
};

/**
 * Zakończ impersonację — przywraca oryginalny token admina.
 */
export const leaveImpersonation = async (): Promise<LeaveImpersonateResponse> => {
  try {
    return await apiClient.post<LeaveImpersonateResponse>(API_ENDPOINTS.IMPERSONATE_LEAVE);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 400) {
      throw new Error('Nie jesteś w trybie impersonacji.');
    }
    throw new Error(apiError.message || 'Nie udało się zakończyć impersonacji.');
  }
};
