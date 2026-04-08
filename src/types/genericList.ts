/**
 * Generic List Types
 * Typy dla generycznego widoku listy opartego na meta z backendu
 */

// ================== COLUMN DEFINITIONS ==================

export type ColumnType =
  | 'text'
  | 'email'
  | 'phone'
  | 'full_name'
  | 'actions'
  | 'status'
  | 'badge'
  | 'datetime'
  | 'array';

export interface ColumnDef {
  type: ColumnType;
  label: string;
  property: string | null;
  sortable: boolean;
}

// ================== SORT DEFINITIONS ==================

export interface SortDef {
  property: string;
  label: string;
  order: 'asc' | 'desc';
}

// ================== FILTER DEFINITIONS ==================

export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Backend can return filter options in many formats:
 * - Array of {value, label} objects
 * - Object keyed by id with {value, label} objects
 * - Object keyed by id with plain string values  e.g. {"1": "Admin", "2": "Broker"}
 * - Array of plain strings e.g. ["active", "inactive"]
 * - value can be number or string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawFilterOptions = FilterOption[] | Record<string, any> | string[];

export interface FilterDef {
  type: 'select' | 'text' | 'date' | 'date_range' | 'range';
  key: string;
  label: string;
  options?: RawFilterOptions;
  is_multiple: boolean;
}

/**
 * Normalize filter options from any backend format into a consistent FilterOption[] array.
 * Handles:
 *  - Already normalized array of {value, label}
 *  - Object of {value, label} (e.g. {"1": {value: 1, label: "Admin"}})
 *  - Object of plain strings (e.g. {"admin": "Administrator", "broker": "Broker"})
 *  - Array of plain strings (e.g. ["active", "inactive"])
 *  - Numeric values — always coerced to string for Select compatibility
 */
export function normalizeFilterOptions(raw: RawFilterOptions | undefined): FilterOption[] {
  if (!raw) return [];

  // Already an array
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      // Plain string
      if (typeof item === 'string') {
        return { value: item, label: item };
      }
      // Object with value + label
      if (item && typeof item === 'object' && 'value' in item && 'label' in item) {
        return { value: String(item.value), label: String(item.label) };
      }
      // Fallback
      return { value: String(item), label: String(item) };
    });
  }

  // Object — iterate entries
  return Object.entries(raw).map(([key, val]) => {
    // val is a {value, label} object
    if (val && typeof val === 'object' && 'label' in val) {
      return { value: String(val.value ?? key), label: String(val.label) };
    }
    // val is a plain string (key→label mapping)
    if (typeof val === 'string') {
      return { value: key, label: val };
    }
    // Fallback
    return { value: key, label: String(val) };
  });
}

export type FiltersState = Record<string, string | string[]>;

// ================== ACTION DEFINITIONS ==================

export type ActionType =
  | 'button_primary'
  | 'button_secondary'
  | 'button_delete'
  | 'button_archive'
  | 'button_restore'
  | 'button_icon';

export interface ActionDef {
  type: ActionType;
  label: string;
  handler: string;
  icon?: string;
}

export interface GeneralActionDef {
  type: ActionType;
  label: string;
  handler: string;
}

// ================== PAGINATION ==================

export interface PaginationMeta {
  page: number;
  perPage: number;
  pages: number;
  count: number;
}

// ================== META RESPONSE ==================

export interface ListMeta {
  pagination: PaginationMeta;
  sortable: SortDef[];
  filtersDefs: FilterDef[];
  generalActions: GeneralActionDef[];
  columnDefs: ColumnDef[];
}

// ================== API RESPONSE ==================

export interface GenericRecord {
  [key: string]: unknown;
  actions?: ActionDef[];
  meta?: {
    columns?: Record<
      string,
      {
        tooltip?: {
          content: string[];
        };
      }
    >;
  };
}

export interface GenericListResponse<T extends GenericRecord = GenericRecord> {
  data: T[];
  meta: ListMeta;
}

// ================== COMPONENT PROPS ==================

export type RowHandler<T extends GenericRecord = GenericRecord> = (row: T) => void | Promise<void>;
export type GeneralHandler = () => void | Promise<void>;
export type BulkHandler<T extends GenericRecord = GenericRecord> = (
  rows: T[]
) => void | Promise<void>;

export interface BulkAction {
  label: string;
  handler: string;
  variant?: 'primary' | 'secondary' | 'outlined';
  icon?: React.ReactNode;
}

/**
 * Frontend-defined row action added on top of backend actions[].
 * Rendered in the same kebab-menu, below backend actions.
 */
export interface ExtraRowAction<T extends GenericRecord = GenericRecord> {
  /** Unique handler key (also used as key in handlers map) */
  handler: string;
  label: string;
  /** Icon rendered in the menu item */
  icon?: React.ReactNode;
  /** MUI action type — controls icon and colour */
  type?: ActionType;
  /** Optional predicate — return false to hide action for a specific row */
  show?: (row: T) => boolean;
}

export interface FetcherParams {
  page: number;
  perPage: number;
  search: string;
  sortProperty: string;
  sortOrder: 'asc' | 'desc';
  filters: FiltersState;
  /** Column properties to exclude from backend response */
  disabledColumns?: string[];
  /** Filter keys to exclude from backend response */
  disabledFilters?: string[];
}

export type Fetcher<T extends GenericRecord = GenericRecord> = (
  params: FetcherParams
) => Promise<GenericListResponse<T>>;

export interface GenericListViewProps<T extends GenericRecord = GenericRecord> {
  title: string;
  fetcher: Fetcher<T>;
  handlers: Record<string, RowHandler<T> | GeneralHandler>;
  bulkActions?: BulkAction[];
  bulkHandlers?: Record<string, BulkHandler<T>>;
  /** Unique key to identify each row (defaults to 'id') */
  rowKey?: keyof T | ((row: T) => string);
  /** Initial page size */
  initialPerPage?: number;
  /** Change to trigger refetch */
  refreshKey?: string | number;
  /** Frontend-defined row actions appended after backend actions in the kebab menu */
  extraRowActions?: ExtraRowAction<T>[];
  /** Column properties to exclude from backend response */
  disabledColumns?: string[];
  /** Filter keys to exclude from backend response */
  disabledFilters?: string[];
  /** General action handler names to hide (e.g. ['create-client']) */
  disabledGeneralActions?: string[];
  /**
   * When provided, filter/search/sort/page/perPage state is persisted in the
   * global store under this key and restored when the component remounts.
   * Use the route path, e.g. '/app/clients'.
   */
  stateKey?: string;
}

// ================== CONTROLLER STATE ==================

export interface ListControllerState<T extends GenericRecord = GenericRecord> {
  // Data
  data: T[];
  meta: ListMeta | null;

  // Loading states
  loading: boolean;
  error: string | null;

  // Pagination
  page: number;
  perPage: number;

  // Search
  search: string;

  // Sort
  sortProperty: string;
  sortOrder: 'asc' | 'desc';

  // Filters
  filters: FiltersState;
  activeFiltersCount: number;

  // Selection
  selectedRows: T[];
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
}

export interface ListControllerActions<T extends GenericRecord = GenericRecord> {
  // Pagination
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;

  // Search
  setSearch: (search: string) => void;

  // Sort
  setSort: (property: string, order: 'asc' | 'desc') => void;

  // Filters
  setFilter: (key: string, value: string | string[]) => void;
  clearFilters: () => void;

  // Selection
  toggleRowSelection: (row: T) => void;
  toggleAllSelection: () => void;
  clearSelection: () => void;

  // Refetch
  refetch: () => Promise<void>;
}

export type UseGenericListController<T extends GenericRecord = GenericRecord> =
  ListControllerState<T> & ListControllerActions<T>;
