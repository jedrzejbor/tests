import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';
import type { PolicyDetailsData } from '@/services/policiesService';

// ================== CLAIM FORM TYPES ==================

export interface ClaimFormFieldOption {
  id: number;
  label: string;
}

export interface ClaimFormField {
  key: string;
  type: 'text' | 'number' | 'bool' | 'date' | 'datetime' | 'select-single' | 'select-multi';
  label: string;
  required: boolean;
  options?: ClaimFormFieldOption[];
}

export interface ClaimFormDefinitionResponse {
  fields: ClaimFormField[];
}

// ================== CLAIM SUBMIT TYPES ==================

/**
 * Dynamic payload — keys match ClaimFormField.key
 * Values depend on field type:
 *   text      → string
 *   number    → number
 *   bool      → boolean
 *   date      → string (YYYY-MM-DD)
 *   datetime  → string (YYYY-MM-DD HH:mm:ss)
 *   select-single → number (option id)
 *   select-multi  → number[] (option ids)
 */
type ClaimMetaValue = string | number | boolean | number[] | string[] | null;

const CLAIM_SORT_FALLBACKS: Record<string, string> = {
  client_name: 'created_at'
};

// Wewnętrzne klucze dodawane przez createPolicyClaimsFetcher —
// używane tylko do filtrowania po stronie klienta, nie wysyłamy ich do backendu.
// Prawidłowe filtry backendu: policy_status, claim_date, reported_date,
// insurance_company_id, policy_type_id, client_id
const CLAIM_FILTER_BLOCKLIST = new Set(['policy', 'policy_id']);

export type ClaimMeta = Record<string, ClaimMetaValue>;

export interface ClaimCreatePayload {
  policy_id: number;
  claim_date: string;
  is_vat_payer: boolean;
  is_exclusive_claim: boolean;
  is_transferred: boolean;
  street: string;
  street_no: string;
  city: string;
  postal: string;
  reported_date?: string;
  number?: string;
  claim_description?: string;
  claim_address?: string;
  exclusive_claim_note?: string;
  transferred_note?: string;
  payout_account_no?: string;
  meta?: ClaimMeta;
}

export type ClaimUpdatePayload = Omit<ClaimCreatePayload, 'policy_id'>;

export interface ClaimAddress {
  street: string;
  street_no: string;
  city: string;
  postal: string;
}

export interface ClaimResource {
  id: number;
  policy_id: number;
  policy?: PolicyDetailsData;
  reported_date: string | null;
  claim_date: string;
  number: string | null;
  claim_description: string | null;
  claim_address: string | null;
  is_vat_payer: boolean;
  is_exclusive_claim: boolean;
  exclusive_claim_note: string | null;
  is_transferred: boolean;
  transferred_note: string | null;
  payout_account_no: string | null;
  meta: ClaimMeta | null;
  address?: ClaimAddress | null;
  deleted_at?: string | null;
}

export interface ClaimDetailsResponse {
  claim: ClaimResource;
}

// ================== API FUNCTIONS ==================

/**
 * Pobiera definicję formularza zgłoszenia szkody dla danej polisy.
 * GET /api/policy/form/{policyId}
 */
export const fetchClaimFormDefinition = (policyId: number): Promise<ClaimFormDefinitionResponse> =>
  apiClient.get<ClaimFormDefinitionResponse>(`${API_ENDPOINTS.POLICY_CLAIM_FORM}/${policyId}`);

/**
 * Tworzy zgłoszenie szkody.
 * POST /api/claim
 */
export const submitClaim = (payload: ClaimCreatePayload): Promise<ClaimResource> =>
  apiClient.post<ClaimResource>(API_ENDPOINTS.CLAIM, payload);

export const getClaimDetails = (claimId: string | number): Promise<ClaimDetailsResponse> =>
  apiClient.get<ClaimDetailsResponse>(`${API_ENDPOINTS.CLAIM}/${claimId}`);

export const updateClaim = (
  claimId: string | number,
  payload: ClaimUpdatePayload
): Promise<ClaimResource> =>
  apiClient.post<ClaimResource>(`${API_ENDPOINTS.CLAIM}/${claimId}`, payload);

export const archiveClaim = async (claimId: string | number, password: string): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.CLAIM}/${claimId}/archive`, { password });
};

export const restoreClaim = async (claimId: string | number): Promise<void> => {
  await apiClient.post(`${API_ENDPOINTS.CLAIM}/${claimId}/restore`);
};

export const forceDeleteClaim = async (
  claimId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.CLAIM}/${claimId}/delete`, { password });
};

// ================== CLAIM TABLE TYPES ==================

/**
 * Pojedynczy wiersz z endpointu tabeli szkód.
 */
export interface ClaimRecord extends GenericRecord {
  id?: string | number;
  policy_id?: string | number;
  client_id?: string | number;
  client_name?: string;
  insurance_company_name?: string;
  policy_number?: string;
  reported_date?: string;
  claim_date?: string;
  number?: string;
  claim_type?: string;
  claim_address?: string;
  deleted_at?: string | null;
}

// ================== QUERY STRING ==================

const buildQueryString = (params: FetcherParams): string => {
  const query = new URLSearchParams();

  query.set('page', String(params.page));
  query.set('perPage', String(params.perPage));

  if (params.search) {
    query.set('search', params.search);
  }

  if (params.sortProperty) {
    query.set('sort', CLAIM_SORT_FALLBACKS[params.sortProperty] ?? params.sortProperty);
    query.set('order', params.sortOrder);
  }

  Object.entries(params.filters).forEach(([key, value]) => {
    if (CLAIM_FILTER_BLOCKLIST.has(key)) return;

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

  params.disabledColumns?.forEach((col) => query.append('disabled-columns[]', col));
  params.disabledFilters?.forEach((f) => query.append('disabled-filters[]', f));

  return query.toString();
};

// ================== TABLE API FUNCTIONS ==================

/**
 * Pobiera tabelę szkód.
 * GET /api/resource/claims
 */
export const fetchClaimsTable = async (
  params: FetcherParams
): Promise<GenericListResponse<ClaimRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.CLAIMS_TABLE}?${queryString}`;

  if (!import.meta.env.PROD) console.debug('[claimsService] GET', endpoint);

  return apiClient.get<GenericListResponse<ClaimRecord>>(endpoint);
};

/**
 * Tworzy fetcher ograniczony do konkretnej polisy.
 */
export const createPolicyClaimsFetcher = (policyId: string | number, policyNumber?: string) => {
  return async (params: FetcherParams): Promise<GenericListResponse<ClaimRecord>> => {
    const requestPerPage = Math.max(params.perPage, 1000);
    const scopedParams: FetcherParams = {
      ...params,
      page: 1,
      perPage: requestPerPage,
      search: policyNumber || params.search,
      filters: {
        ...params.filters,
        policy: String(policyId),
        policy_id: String(policyId)
      }
    };
    const response = await fetchClaimsTable(scopedParams);

    const normalizedPolicyId = String(policyId);
    const normalizedPolicyNumber = policyNumber?.trim().toLowerCase();
    const userSearch = params.search.trim().toLowerCase();

    const filteredData = response.data.filter((claim) => {
      const rowPolicyId =
        claim.policy_id ?? (claim.policy as { id?: string | number } | undefined)?.id;
      const rowPolicyNumber = claim.policy_number?.trim().toLowerCase();

      const belongsToPolicy =
        (rowPolicyId !== undefined && String(rowPolicyId) === normalizedPolicyId) ||
        (normalizedPolicyNumber !== undefined && rowPolicyNumber === normalizedPolicyNumber);

      if (!belongsToPolicy) return false;
      if (!userSearch) return true;

      return Object.values(claim).some((value) =>
        typeof value === 'string' ? value.toLowerCase().includes(userSearch) : false
      );
    });

    const sortedData = [...filteredData].sort((a, b) => {
      const property = params.sortProperty as keyof ClaimRecord;
      if (!property) return 0;
      const left = a[property];
      const right = b[property];
      const leftValue = left === undefined || left === null ? '' : String(left);
      const rightValue = right === undefined || right === null ? '' : String(right);
      return params.sortOrder === 'desc'
        ? rightValue.localeCompare(leftValue, 'pl')
        : leftValue.localeCompare(rightValue, 'pl');
    });

    const start = (params.page - 1) * params.perPage;
    const paginatedData = sortedData.slice(start, start + params.perPage);
    const count = sortedData.length;
    const pages = Math.max(1, Math.ceil(count / params.perPage));

    return {
      ...response,
      data: paginatedData,
      meta: {
        ...response.meta,
        pagination: {
          ...response.meta.pagination,
          page: params.page,
          perPage: params.perPage,
          pages,
          count
        }
      }
    };
  };
};

/**
 * Tworzy fetcher ograniczony do konkretnego klienta.
 */
export const createClientClaimsFetcher = (clientId: string | number, clientName?: string) => {
  return async (params: FetcherParams): Promise<GenericListResponse<ClaimRecord>> => {
    const requestPerPage = Math.max(params.perPage, 1000);
    const scopedParams: FetcherParams = {
      ...params,
      page: 1,
      perPage: requestPerPage,
      filters: {
        ...params.filters,
        client_id: String(clientId)
      }
    };
    const response = await fetchClaimsTable(scopedParams);

    const normalizedClientId = String(clientId);
    const normalizedClientName = clientName?.trim().toLowerCase();
    const userSearch = params.search.trim().toLowerCase();
    const rowsExposeClientIdentity = response.data.some((claim) => {
      const rowClientId =
        claim.client_id ?? (claim.client as { id?: string | number } | undefined)?.id;
      return rowClientId !== undefined || Boolean(claim.client_name);
    });

    const filteredData = response.data.filter((claim) => {
      const rowClientId =
        claim.client_id ?? (claim.client as { id?: string | number } | undefined)?.id;
      const rowClientName = claim.client_name?.trim().toLowerCase();

      const belongsToClient =
        !rowsExposeClientIdentity ||
        (rowClientId !== undefined && String(rowClientId) === normalizedClientId) ||
        (normalizedClientName !== undefined && rowClientName === normalizedClientName);

      if (!belongsToClient) return false;
      if (!userSearch) return true;

      return Object.values(claim).some((value) =>
        typeof value === 'string' ? value.toLowerCase().includes(userSearch) : false
      );
    });

    const sortedData = [...filteredData].sort((a, b) => {
      const property = params.sortProperty as keyof ClaimRecord;
      if (!property) return 0;
      const left = a[property];
      const right = b[property];
      const leftValue = left === undefined || left === null ? '' : String(left);
      const rightValue = right === undefined || right === null ? '' : String(right);
      return params.sortOrder === 'desc'
        ? rightValue.localeCompare(leftValue, 'pl')
        : leftValue.localeCompare(rightValue, 'pl');
    });

    const start = (params.page - 1) * params.perPage;
    const paginatedData = sortedData.slice(start, start + params.perPage);
    const count = sortedData.length;
    const pages = Math.max(1, Math.ceil(count / params.perPage));

    return {
      ...response,
      data: paginatedData,
      meta: {
        ...response.meta,
        pagination: {
          ...response.meta.pagination,
          page: params.page,
          perPage: params.perPage,
          pages,
          count
        }
      }
    };
  };
};
