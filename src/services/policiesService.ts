import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
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

// ================== DETAIL TYPES ==================

export interface PolicyPaymentDetail {
  id: number;
  payment_date: string;
  payment_total: string; // formatted e.g. "500,00 zł"
  margin: string; // formatted e.g. "50,00 zł"
  status: string;
}

export interface PolicyDetailsData {
  id: number;
  client_id: number;
  insurance_company_id: number;
  insurance_company_name?: string;
  policy_type_id: number;
  policy_type_name?: string;
  number: string;
  car_plates: string | null;
  date_signed_at: string;
  date_from: string;
  date_to: string;
  city: string;
  bank_name: string;
  bank_account_number: string;
  description: string | null;
  payment_total: string; // formatted
  margin_percent: string; // e.g. "10.00"
  payments_count: number;
  first_update_clause_of_su: boolean;
  automatic_coverage_clause: boolean;
  current_assets_settlement_clause: boolean;
  attachment: string; // URL or empty string
  payments: PolicyPaymentDetail[];
  status: { label: string; key: string };
}

export interface PolicyDetailsResponse {
  policy: PolicyDetailsData;
  actions?: { type: string; label: string; handler: string }[];
}

// ================== FORM OPTIONS ==================

export interface SelectOption {
  value: number;
  label: string;
}

export interface PolicyFormOptionsResponse {
  clients: SelectOption[];
  insurance_companies: SelectOption[];
  policy_types: SelectOption[];
}

// ================== PAYLOADS ==================

export interface CreatePolicyPaymentDetail {
  amount: number; // in grosze
  payment_date: string; // YYYY-MM-DD
}

export interface UpdatePolicyPaymentDetail {
  id?: number; // existing payment id — omit for new
  amount: number; // in grosze
  payment_date: string; // YYYY-MM-DD
}

export interface CreatePolicyFields {
  client_id: number;
  insurance_company_id: number;
  policy_type_id: number;
  number: string;
  car_plates?: string | null;
  date_signed_at: string;
  date_from: string;
  date_to: string;
  city: string;
  bank_name: string;
  bank_account_number: string;
  description?: string | null;
  payment_total: number; // grosze
  payment_total_currency?: string;
  margin_percent: number;
  payments_count: number;
  first_update_clause_of_su: boolean;
  automatic_coverage_clause: boolean;
  current_assets_settlement_clause: boolean;
  attachment?: File | null;
  payment_details: CreatePolicyPaymentDetail[];
}

export interface UpdatePolicyFields {
  client_id?: number;
  insurance_company_id?: number;
  policy_type_id?: number;
  number?: string;
  car_plates?: string | null;
  date_signed_at?: string;
  date_from?: string;
  date_to?: string;
  city?: string;
  bank_name?: string;
  bank_account_number?: string;
  description?: string | null;
  payment_total?: number; // grosze
  payment_total_currency?: string;
  margin_percent?: number;
  payments_count?: number;
  first_update_clause_of_su?: boolean;
  automatic_coverage_clause?: boolean;
  current_assets_settlement_clause?: boolean;
  attachment?: File | null;
  payment_details?: UpdatePolicyPaymentDetail[];
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

// ================== HELPERS ==================

/**
 * Auth headers for raw fetch calls (multipart/form-data).
 * Skip Content-Type so the browser sets boundary automatically.
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = useAuthStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorData: { message?: string; errors?: Record<string, string[]> } = {};
    try {
      errorData = await response.json();
    } catch {
      // not JSON
    }
    const error = {
      message: errorData.message || `Błąd HTTP: ${response.status}`,
      errors: errorData.errors,
      status: response.status
    };
    throw error;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
};

/**
 * Build FormData for policy create/update.
 * Handles nested payment_details array and file attachment.
 */
const buildPolicyFormData = (fields: CreatePolicyFields | UpdatePolicyFields): FormData => {
  const fd = new FormData();

  const simple: [string, string | number | boolean | undefined | null][] = [
    ['client_id', fields.client_id],
    ['insurance_company_id', fields.insurance_company_id],
    ['policy_type_id', fields.policy_type_id],
    ['number', fields.number],
    ['car_plates', fields.car_plates],
    ['date_signed_at', fields.date_signed_at],
    ['date_from', fields.date_from],
    ['date_to', fields.date_to],
    ['city', fields.city],
    ['bank_name', fields.bank_name],
    ['bank_account_number', fields.bank_account_number],
    ['description', fields.description],
    ['payment_total', fields.payment_total],
    ['payment_total_currency', (fields as CreatePolicyFields).payment_total_currency],
    ['margin_percent', fields.margin_percent],
    ['payments_count', fields.payments_count],
    ['first_update_clause_of_su', fields.first_update_clause_of_su],
    ['automatic_coverage_clause', fields.automatic_coverage_clause],
    ['current_assets_settlement_clause', fields.current_assets_settlement_clause]
  ];

  simple.forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'boolean') {
        fd.append(key, val ? '1' : '0');
      } else {
        fd.append(key, String(val));
      }
    }
  });

  // payment_details array
  const details = fields.payment_details;
  if (details && details.length > 0) {
    details.forEach((d, i) => {
      if ('id' in d && d.id !== undefined) {
        fd.append(`payment_details[${i}][id]`, String(d.id));
      }
      fd.append(`payment_details[${i}][amount]`, String(d.amount));
      fd.append(`payment_details[${i}][payment_date]`, d.payment_date);
    });
  }

  // attachment
  if (fields.attachment instanceof File) {
    fd.append('attachment', fields.attachment);
  } else if (fields.attachment === null) {
    // explicit null → remove existing attachment
    fd.append('attachment', '');
  }

  return fd;
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
 * Create a fetcher scoped to a specific client (pre-filters by client_id).
 */
export const createClientPoliciesFetcher = (clientId: string | number) => {
  return async (params: FetcherParams): Promise<GenericListResponse<PolicyRecord>> => {
    const scopedParams: FetcherParams = {
      ...params,
      filters: {
        ...params.filters,
        client_id: String(clientId)
      }
    };
    return fetchPoliciesTable(scopedParams);
  };
};

/**
 * Get form options for policy create/edit (clients, insurance_companies, policy_types)
 */
export const getPolicyFormOptions = async (): Promise<PolicyFormOptionsResponse> => {
  return apiClient.get<PolicyFormOptionsResponse>(API_ENDPOINTS.POLICY_FORM_OPTIONS);
};

/**
 * Get single policy details
 */
export const getPolicyDetails = async (
  policyId: string | number
): Promise<PolicyDetailsResponse> => {
  return apiClient.get<PolicyDetailsResponse>(`${API_ENDPOINTS.POLICY}/${policyId}`);
};

/**
 * Create policy (multipart/form-data)
 */
export const createPolicy = async (fields: CreatePolicyFields): Promise<PolicyDetailsResponse> => {
  const formData = buildPolicyFormData(fields);

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.POLICY}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<PolicyDetailsResponse>(response);
};

/**
 * Update policy (multipart/form-data)
 */
export const updatePolicy = async (
  policyId: string | number,
  fields: UpdatePolicyFields
): Promise<PolicyDetailsResponse> => {
  const formData = buildPolicyFormData(fields);

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.POLICY}/${policyId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<PolicyDetailsResponse>(response);
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

/**
 * Download a policy attachment via the dedicated API endpoint.
 *
 * The `attachmentUrl` is taken directly from the `attachment` field
 * returned by `GET /api/policy/{id}` (e.g. "http://…/api/policy/attachment/15").
 * The backend streams the file with `Content-Disposition: attachment`.
 */
export const downloadPolicyAttachment = async (
  attachmentUrl: string,
  fallbackFilename = 'zalacznik'
): Promise<void> => {
  if (!attachmentUrl) return;

  const token = useAuthStore.getState().token;
  const headers: HeadersInit = { Accept: '*/*' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(attachmentUrl, { method: 'GET', headers });

  if (!response.ok) {
    throw { message: 'Nie udało się pobrać załącznika', status: response.status };
  }

  // Try to get filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition') || '';
  let filename = fallbackFilename;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const plainMatch = disposition.match(/filename="?([^"\s;]+)"?/i);
    if (plainMatch) {
      filename = plainMatch[1];
    }
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};
