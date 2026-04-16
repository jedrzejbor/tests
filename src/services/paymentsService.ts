import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';

// ================== RECORD TYPES ==================

/**
 * Payment record from table endpoint (GET /api/resource/policy/payments)
 */
export interface PaymentRecord extends GenericRecord {
  id?: string | number;
  insurance_company_name: string;
  policy_number: string;
  payment_date: string;
  payment_total: string; // formatted "1 234,56 zł"
  margin: string; // formatted "123,45 zł"
  margin_percent: string;
  status: string;
  deleted_at?: string | null;
}

// ================== DETAIL TYPES ==================

export interface PaymentDetailsApiPayment {
  id: number;
  client_id: string; // resolved to client name
  insurance_company_id: string; // resolved to company name
  policy_id: string; // resolved to policy name
  payment_date: string;
  payment_total: string; // formatted money
  margin_percent: string;
  margin: string; // formatted money
  status: string; // human-readable label
}

export interface PaymentDetailsResponse {
  payment: PaymentDetailsApiPayment;
}

// ================== FORM OPTIONS ==================

export interface PaymentFormOption {
  value: number | string;
  label: string;
}

export interface PaymentFormOptions {
  insurance_companies: PaymentFormOption[];
  policies: PaymentFormOption[];
  statuses: PaymentFormOption[];
}

// ================== PAYLOADS ==================

export interface CreatePaymentFields {
  client_id: number;
  insurance_company_id: number;
  policy_id: number;
  payment_date: string; // YYYY-MM-DD
  payment_total: number; // decimal, e.g. 1000.50
  payment_total_currency?: string; // defaults to 'PLN'
  margin_percent: number; // 0-100
  status: string; // pending | paid | overdue
}

export interface UpdatePaymentFields {
  insurance_company_id?: number;
  policy_id?: number;
  payment_date?: string;
  payment_total?: number;
  payment_total_currency?: string;
  margin_percent?: number;
  status?: string;
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
 * Fetch payments table data (for GenericListView)
 */
export const fetchPaymentsTable = async (
  params: FetcherParams
): Promise<GenericListResponse<PaymentRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.PAYMENTS_TABLE}?${queryString}`;

  if (!import.meta.env.PROD) console.debug('[paymentsService] GET', endpoint);

  return apiClient.get<GenericListResponse<PaymentRecord>>(endpoint);
};

/**
 * Create a fetcher scoped to a specific client (pre-filters by client_id).
 */
export const createClientPaymentsFetcher = (clientId: string | number) => {
  return async (params: FetcherParams): Promise<GenericListResponse<PaymentRecord>> => {
    const scopedParams: FetcherParams = {
      ...params,
      filters: {
        ...params.filters,
        client: String(clientId)
      }
    };
    return fetchPaymentsTable(scopedParams);
  };
};

/**
 * Get payment form options (insurance companies, policies, statuses)
 */
export const getPaymentFormOptions = async (): Promise<PaymentFormOptions> => {
  return apiClient.get<PaymentFormOptions>(API_ENDPOINTS.PAYMENTS_FORM);
};

/**
 * Create a new payment (JSON body)
 */
export const createPayment = async (
  fields: CreatePaymentFields
): Promise<PaymentDetailsResponse> => {
  return apiClient.post<PaymentDetailsResponse>(API_ENDPOINTS.PAYMENTS, fields);
};

/**
 * Update an existing payment (JSON body)
 */
export const updatePayment = async (
  paymentId: string | number,
  fields: UpdatePaymentFields
): Promise<PaymentDetailsResponse> => {
  return apiClient.post<PaymentDetailsResponse>(`${API_ENDPOINTS.PAYMENTS}/${paymentId}`, fields);
};

/**
 * Archive (soft delete) payment — requires password confirmation
 */
export const archivePayment = async (
  paymentId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.PAYMENTS}/${paymentId}/archive`, { password });
};

/**
 * Force delete payment permanently — requires password confirmation
 */
export const forceDeletePayment = async (
  paymentId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.PAYMENTS}/${paymentId}/force`, { password });
};

/**
 * Restore archived payment
 */
export const restorePayment = async (paymentId: string | number): Promise<void> => {
  await apiClient.post(`${API_ENDPOINTS.PAYMENTS}/${paymentId}/restore`);
};
