/**
 * Konfiguracja API - pobiera bazowy URL z zmiennych środowiskowych
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  ME: '/api/me',
  PASSWORD_REQUEST: '/api/request',
  PASSWORD_CHANGE: '/api/change',
  // User form options
  USER_FORM: '/api/user/form',
  // Impersonation
  IMPERSONATE: '/api/impersonate', // POST /api/impersonate/{userId}
  IMPERSONATE_LEAVE: '/api/impersonate/leave',
  // Generic list endpoints
  USERS_TABLE: '/api/resource/users',
  CLIENTS_TABLE: '/api/resource/clients',
  // Client form options
  CLIENT_FORM: '/api/client/form'
  // Tutaj dodawaj kolejne endpointy
} as const;

/**
 * Pobiera pełny URL endpointu
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
