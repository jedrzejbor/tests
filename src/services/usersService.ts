import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';

/**
 * User record type from backend
 */
export interface UserRecord extends GenericRecord {
  id?: string | number;
  company: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  status: string;
  deleted_at?: string | null;
}

export interface UserDetailsApiUser {
  id: string | number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  position?: string;
  created_at?: string;
  password_last_change_at?: string;
  role?: string | number | null;
  /** Numeric client/company ID returned by backend (client_id column) */
  client_id?: number | null;
  /** Legacy string field – kept for backwards compatibility */
  company?: string | number | null;
  scopes_of_competence?: string[];
  status?: string;
  marketing_consent?: boolean | null;
}

export interface UserDetailsResponse {
  user: UserDetailsApiUser;
  actions?: { type: string; label: string; handler: string }[];
}

export interface RoleOption {
  value: number;
  label: string;
}

export interface CompanyOption {
  value: number;
  label: string;
}

export interface CreateUserPayload {
  firstname: string;
  lastname: string;
  position?: string;
  phone: string;
  email: string;
  password?: string;
  role: number;
  status: 'active' | 'inactive';
  scopes_of_competence?: string[];
  company?: number;
  marketing_consent?: boolean;
}

export interface UpdateUserPayload {
  firstname?: string | null;
  lastname?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  password?: string;
  password_confirmation?: string;
  role?: number | null;
  status?: 'active' | 'inactive' | null;
  scopes_of_competence?: string[] | null;
  company?: number | null;
  marketing_consent?: boolean | null;
}

export interface CreateUserResponse {
  user: UserDetailsApiUser;
  generated_password?: string;
  password?: string;
}

export interface UpdateUserResponse {
  user: UserDetailsApiUser;
}

export interface UserCreateOptionsResponse {
  roles: RoleOption[] | Record<string, RoleOption>;
  companies: CompanyOption[] | Record<string, CompanyOption> | string[];
  scopes_of_competence: string[];
  statuses?: string[];
}

/**
 * Build query string from FetcherParams
 */
const buildQueryString = (params: FetcherParams): string => {
  const query = new URLSearchParams();

  // Pagination
  query.set('page', String(params.page));
  query.set('per-page', String(params.perPage));

  // Search
  if (params.search) {
    query.set('search', params.search);
  }

  // Sort
  if (params.sortProperty) {
    query.set('sort', params.sortProperty);
    query.set('sort-order', params.sortOrder);
  }

  // Filters - backend expects filters[key]=value format
  // Multi-select values should be comma-separated: filters[firstname]=Marcin,Krzysztof
  Object.entries(params.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // For multiple values, send as comma-separated in single parameter
        const nonEmptyValues = value.filter((v) => v !== undefined && v !== null && v !== '');
        if (nonEmptyValues.length > 0) {
          query.set(`filters[${key}]`, nonEmptyValues.join(','));
        }
      } else {
        query.set(`filters[${key}]`, String(value));
      }
    }
  });

  return query.toString();
};

/**
 * Fetch users table data from backend API
 */
export const fetchUsersTable = async (
  params: FetcherParams
): Promise<GenericListResponse<UserRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.USERS_TABLE}?${queryString}`;
  // Helpful for debugging: log full endpoint when devtools are enabled

  if (!import.meta.env.PROD) console.debug('[usersService] GET', endpoint);

  return apiClient.get<GenericListResponse<UserRecord>>(endpoint);
};

/**
 * Create user
 */
export const createUser = async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
  return apiClient.post<CreateUserResponse>('/api/user', payload);
};

/**
 * Update user
 */
export const updateUser = async (
  userId: string | number,
  payload: UpdateUserPayload
): Promise<UpdateUserResponse> => {
  return apiClient.post<UpdateUserResponse>(`/api/user/${userId}`, payload);
};

/**
 * Fetch available options for create/edit user
 */
export const getUserCreateOptions = async (): Promise<UserCreateOptionsResponse> => {
  return apiClient.get<UserCreateOptionsResponse>('/api/user/form');
};

/**
 * Delete user by ID
 */
export const deleteUser = async (userId: string | number, password: string): Promise<void> => {
  await apiClient.delete(`/api/user/${userId}`, {
    body: JSON.stringify({ password })
  });
};

/**
 * Force delete user by ID
 */
export const forceDeleteUser = async (userId: string | number, password: string): Promise<void> => {
  await apiClient.delete(`/api/user/${userId}/force-delete`, {
    body: JSON.stringify({ password })
  });
};

/**
 * Restore soft-deleted user by ID
 */
export const restoreUser = async (userId: string | number): Promise<void> => {
  await apiClient.post(`/api/user/${userId}/restore`);
};

/**
 * Fetch single user details
 */
export const getUserDetails = async (userId: string | number): Promise<UserDetailsResponse> => {
  return apiClient.get<UserDetailsResponse>(`/api/user/${userId}`);
};

/**
 * Export users list
 */
export const exportUsers = async (filters?: FetcherParams['filters']): Promise<Blob> => {
  // This would typically return a file download
  const queryString = filters
    ? new URLSearchParams(filters as Record<string, string>).toString()
    : '';
  const response = await fetch(`/api/users/export?${queryString}`, {
    method: 'GET',
    headers: {
      Accept: 'application/octet-stream'
    }
  });
  return response.blob();
};
