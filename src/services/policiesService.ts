import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';

// ================== RECORD TYPES ==================

/**
 * Policy record from table endpoint (GET /api/resource/policy/policy)
 */
export interface PolicyRecord extends GenericRecord {
  id?: string | number;
  client: string;
  insurance_company: string;
  number: string;
  type: string;
  date_range: string;
  city: string;
  status: string;
  deleted_at?: string | null;
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
 * Fetch policies table data
 */
export const fetchPoliciesTable = async (
  params: FetcherParams
): Promise<GenericListResponse<PolicyRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.POLICIES_TABLE}?${queryString}`;

  if (!import.meta.env.PROD) console.debug('[policiesService] GET', endpoint);

  return apiClient.get<GenericListResponse<PolicyRecord>>(endpoint);
};

/**
 * Archive (soft delete) policy
 */
export const archivePolicy = async (policyId: string | number, password: string): Promise<void> => {
  await apiClient.delete(`/api/policy/${policyId}/archive`, { password });
};

/**
 * Force delete policy permanently
 */
export const forceDeletePolicy = async (
  policyId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`/api/policy/${policyId}/force`, { password });
};

/**
 * Restore archived policy
 */
export const restorePolicy = async (policyId: string | number): Promise<void> => {
  await apiClient.post(`/api/policy/${policyId}/restore`);
};
