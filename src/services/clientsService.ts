import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';

// ================== RECORD TYPES ==================

/**
 * Client record from table endpoint (GET /api/resource/clients)
 */
export interface ClientRecord extends GenericRecord {
  id?: string | number;
  name: string;
  parent_client: string;
  child_client: string;
  type: string;
  status: string;
  authority_scope: string;
  nip: string;
  city: string;
  deleted_at?: string | null;
  /** Row-level meta (e.g. tooltip content) */
  meta?: Record<string, unknown>;
}

// ================== DETAIL TYPES ==================

export interface ClientDetailsApiClient {
  id: number;
  name: string;
  authority_scope?: string;
  type?: string;
  street?: string;
  street_no?: string;
  city?: string;
  postal?: string;
  phone?: string;
  email?: string;
  nip?: string;
  regon?: string;
  krs?: string;
  bank_account?: string;
  website?: string;
  client_parent_id?: number | null;
  client_children_ids?: number[];
  parent_client?: string | null;
  parent_client_name?: string;
  child_client?: string | null;
  child_client_name?: string;
  child_client_names?: string[];
  status?: string;
}

export interface ClientDetailsResponse {
  client: ClientDetailsApiClient;
  actions?: { type: string; label: string; handler: string }[];
  meta?: {
    columns?: Record<string, { tooltip?: { content?: unknown } }>;
  };
}

// ================== FORM OPTIONS ==================

export interface AuthorityScopeOption {
  value: string;
  label: string;
}

export interface ClientTypeOption {
  value: string;
  label: string;
}

export interface ParentClientOption {
  value: number;
  label: string;
}

export interface ClientFormOptionsResponse {
  authority_scope: AuthorityScopeOption[];
  type: ClientTypeOption[];
  clients: ParentClientOption[] | Record<string, ParentClientOption>;
}

// ================== PAYLOADS ==================

export interface CreateClientPayload {
  name: string;
  client_parent_id?: number | null;
  client_children_ids?: number[];
  authority_scope: string;
  type: string;
  nip: string;
  regon?: string;
  krs?: string;
  website?: string;
  bank_account?: string;
  street?: string;
  street_no?: string;
  city?: string;
  postal?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface UpdateClientPayload {
  name?: string | null;
  client_parent_id?: number | null;
  client_children_ids?: number[] | null;
  authority_scope?: string | null;
  type?: string | null;
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  website?: string | null;
  bank_account?: string | null;
  street?: string | null;
  street_no?: string | null;
  city?: string | null;
  postal?: string | null;
  phone?: string | null;
  status?: 'active' | 'inactive' | null;
}

export interface CreateClientResponse {
  client: ClientDetailsApiClient;
}

export interface UpdateClientResponse {
  client: ClientDetailsApiClient;
}

// ================== QUERY STRING ==================

const buildQueryString = (params: FetcherParams): string => {
  const query = new URLSearchParams();

  query.set('page', String(params.page));
  query.set('per-page', String(params.perPage));

  if (params.search) {
    query.set('search', params.search);
  }

  if (params.sortProperty) {
    query.set('sort', params.sortProperty);
    query.set('sort-order', params.sortOrder);
  }

  Object.entries(params.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        const nonEmpty = value.filter((v) => v !== undefined && v !== null && v !== '');
        if (nonEmpty.length > 0) {
          query.set(`filters[${key}]`, nonEmpty.join(','));
        }
      } else {
        query.set(`filters[${key}]`, String(value));
      }
    }
  });

  // disabled-columns[] and disabled-filters[]
  params.disabledColumns?.forEach((col) => query.append('disabled-columns[]', col));
  params.disabledFilters?.forEach((f) => query.append('disabled-filters[]', f));

  return query.toString();
};

// ================== API CALLS ==================

/**
 * Fetch clients table data
 */
export const fetchClientsTable = async (
  params: FetcherParams
): Promise<GenericListResponse<ClientRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.CLIENTS_TABLE}?${queryString}`;

  if (!import.meta.env.PROD) console.debug('[clientsService] GET', endpoint);

  return apiClient.get<GenericListResponse<ClientRecord>>(endpoint);
};

/**
 * Fetch form options for create/edit client.
 * Without clientId — returns all clients (for parent select in create form).
 * With clientId — returns only children of that client (for edit form).
 */
export const getClientFormOptions = async (
  clientId?: string | number
): Promise<ClientFormOptionsResponse> => {
  const url = clientId ? `${API_ENDPOINTS.CLIENT_FORM}/${clientId}` : API_ENDPOINTS.CLIENT_FORM;
  return apiClient.get<ClientFormOptionsResponse>(url);
};

/**
 * Get single client details
 */
export const getClientDetails = async (
  clientId: string | number
): Promise<ClientDetailsResponse> => {
  return apiClient.get<ClientDetailsResponse>(`/api/client/${clientId}`);
};

/**
 * Create client
 */
export const createClient = async (payload: CreateClientPayload): Promise<CreateClientResponse> => {
  return apiClient.post<CreateClientResponse>('/api/client', payload);
};

/**
 * Update client
 */
export const updateClient = async (
  clientId: string | number,
  payload: UpdateClientPayload
): Promise<UpdateClientResponse> => {
  return apiClient.post<UpdateClientResponse>(`/api/client/${clientId}`, payload);
};

/**
 * Archive (soft delete) client
 */
export const archiveClient = async (clientId: string | number, password: string): Promise<void> => {
  await apiClient.delete(`/api/client/${clientId}/archive`, { password });
};

/**
 * Force delete client permanently
 */
export const forceDeleteClient = async (
  clientId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`/api/client/${clientId}/force`, { password });
};

/**
 * Restore archived client
 */
export const restoreClient = async (clientId: string | number): Promise<void> => {
  await apiClient.post(`/api/client/${clientId}/restore`);
};
