import { API_BASE_URL } from '@/config/api';
import { useAuthStore } from '@/store/authStore';

/**
 * Klient HTTP do komunikacji z backendem
 * Automatycznie dodaje Bearer token jeśli jest dostępny
 */

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(skipAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (!skipAuth) {
      const token = useAuthStore.getState().token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Auth-Token'] = token;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: Partial<ApiError> = {};

      try {
        errorData = await response.json();
      } catch {
        // Response nie jest JSON-em
      }

      const error: ApiError = {
        message: errorData.message || `Błąd HTTP: ${response.status}`,
        errors: errorData.errors,
        status: response.status
      };

      throw error;
    }

    // Niektóre odpowiedzi mogą być puste (np. 204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(skipAuth),
      ...fetchOptions
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(skipAuth),
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(skipAuth),
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(skipAuth),
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(skipAuth),
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions
    });

    return this.handleResponse<T>(response);
  }
}

// Eksportuj singleton klienta API
export const apiClient = new ApiClient(API_BASE_URL);

// Eksportuj typ błędu API do użycia w komponentach
export type { ApiError };
