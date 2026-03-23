import { API_ENDPOINTS } from '@/config/api';
import { API_BASE_URL } from '@/config/api';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { GenericListResponse, FetcherParams, GenericRecord } from '@/types/genericList';

// ================== RECORD TYPES ==================

export interface DocumentAttachment {
  id: number;
  name: string;
  size: string;
}

/**
 * Document record from table endpoint (GET /api/resource/documents)
 */
export interface DocumentRecord extends GenericRecord {
  id?: string | number;
  name: string;
  client_name: string;
  date: string;
  description: string;
  attachments: DocumentAttachment[];
  deleted_at?: string | null;
}

// ================== DETAIL TYPES ==================

export interface DocumentClient {
  id: number;
  name: string;
}

export interface DocumentDetailsApiDocument {
  id: number;
  name: string;
  description?: string;
  date: string;
  client: DocumentClient;
  attachments: DocumentAttachment[];
}

export interface DocumentDetailsResponse {
  document: DocumentDetailsApiDocument;
  actions?: { type: string; label: string; handler: string }[];
}

// ================== PAYLOADS ==================

// Create/Update payloads are sent as FormData (multipart/form-data), not JSON.
// These interfaces are for reference only.

export interface CreateDocumentFields {
  client_id: number;
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  attachment: File;
}

export interface UpdateDocumentFields {
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  existingFiles?: { id: number }[];
  newFiles?: File[];
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
 * Get auth headers for raw fetch calls (multipart/form-data).
 * We skip Content-Type so the browser sets it with the correct boundary.
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    Accept: 'application/json'
  };
  const token = useAuthStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }
  return headers;
};

/**
 * Helper to handle fetch responses (same logic as apiClient but for raw fetch).
 */
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

// ================== API CALLS ==================

/**
 * Fetch documents table data (for GenericListView)
 */
export const fetchDocumentsTable = async (
  params: FetcherParams
): Promise<GenericListResponse<DocumentRecord>> => {
  const queryString = buildQueryString(params);
  const endpoint = `${API_ENDPOINTS.DOCUMENTS_TABLE}?${queryString}`;

  if (!import.meta.env.PROD) console.debug('[documentsService] GET', endpoint);

  return apiClient.get<GenericListResponse<DocumentRecord>>(endpoint);
};

/**
 * Create a fetcher scoped to a specific client (pre-filters by client_id).
 */
export const createClientDocumentsFetcher = (clientId: string | number) => {
  return async (params: FetcherParams): Promise<GenericListResponse<DocumentRecord>> => {
    // Inject client filter
    const scopedParams: FetcherParams = {
      ...params,
      filters: {
        ...params.filters,
        client: String(clientId)
      }
    };
    return fetchDocumentsTable(scopedParams);
  };
};

/**
 * Get single document details
 */
export const getDocumentDetails = async (
  documentId: string | number
): Promise<DocumentDetailsResponse> => {
  return apiClient.get<DocumentDetailsResponse>(`/api/documents/${documentId}`);
};

/**
 * Create document (multipart/form-data)
 */
export const createDocument = async (
  fields: CreateDocumentFields
): Promise<{ document: DocumentDetailsApiDocument }> => {
  const formData = new FormData();
  formData.append('client_id', String(fields.client_id));
  formData.append('name', fields.name);
  formData.append('date', fields.date);
  if (fields.description) {
    formData.append('description', fields.description);
  }
  formData.append('attachment', fields.attachment);

  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<{ document: DocumentDetailsApiDocument }>(response);
};

/**
 * Update document (multipart/form-data)
 */
export const updateDocument = async (
  documentId: string | number,
  fields: UpdateDocumentFields
): Promise<{ document: DocumentDetailsApiDocument }> => {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('date', fields.date);
  if (fields.description !== undefined) {
    formData.append('description', fields.description || '');
  }

  // Existing files to keep
  if (fields.existingFiles && fields.existingFiles.length > 0) {
    fields.existingFiles.forEach((file, index) => {
      formData.append(`existingFiles[${index}][id]`, String(file.id));
    });
  }

  // New files
  if (fields.newFiles && fields.newFiles.length > 0) {
    fields.newFiles.forEach((file) => {
      formData.append('newFiles[]', file);
    });
  }

  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<{ document: DocumentDetailsApiDocument }>(response);
};

/**
 * Archive (soft delete) document — requires password confirmation
 */
export const archiveDocument = async (
  documentId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`/api/documents/${documentId}/archive`, {
    body: JSON.stringify({ password })
  });
};

/**
 * Force delete document permanently — requires password confirmation
 */
export const forceDeleteDocument = async (
  documentId: string | number,
  password: string
): Promise<void> => {
  await apiClient.delete(`/api/documents/${documentId}/force`, {
    body: JSON.stringify({ password })
  });
};

/**
 * Restore archived document
 */
export const restoreDocument = async (documentId: string | number): Promise<void> => {
  await apiClient.post(`/api/documents/${documentId}/restore`);
};

/**
 * Download attachment — returns blob URL for browser download
 */
export const downloadAttachment = async (attachmentId: number): Promise<void> => {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = { Accept: '*/*' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Auth-Token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}/api/documents/attachments/${attachmentId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw { message: 'Nie udało się pobrać pliku', status: response.status };
  }

  // Extract filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || 'attachment';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
