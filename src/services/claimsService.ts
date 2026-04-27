import { API_ENDPOINTS } from '@/config/api';
import { apiClient } from '@/services/apiClient';

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
export interface ClaimSubmitPayload {
  policy_id: number;
  fields: Record<string, string | number | boolean | number[]>;
}

// ================== API FUNCTIONS ==================

/**
 * Pobiera definicję formularza zgłoszenia szkody dla danej polisy.
 * GET /api/policy/form/{policyId}
 */
export const fetchClaimFormDefinition = (policyId: number): Promise<ClaimFormDefinitionResponse> =>
  apiClient.get<ClaimFormDefinitionResponse>(`${API_ENDPOINTS.POLICY_CLAIM_FORM}/${policyId}`);

/**
 * Wysyła zgłoszenie szkody.
 * POST /api/claims
 */
export const submitClaim = (payload: ClaimSubmitPayload): Promise<{ id: number }> =>
  apiClient.post<{ id: number }>(API_ENDPOINTS.CLAIMS, payload);
