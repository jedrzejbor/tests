import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  GenericRecord,
  Fetcher,
  FiltersState,
  ListMeta,
  UseGenericListController
} from '@/types/genericList';
import { useListStateStore } from '@/store/listStateStore';

/**
 * Normalize meta from backend.
 * Handles:
 *  - camelCase vs snake_case keys (columnDefs vs column_defs)
 *  - Object-keyed collections vs arrays (backend may return { "0": {...}, "2": {...} }
 *    instead of an array)
 */
function toArray<T>(val: T[] | Record<string, T> | undefined | null): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.values(val);
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMeta(raw: any): ListMeta {
  return {
    pagination: raw.pagination ?? { page: 1, perPage: 10, pages: 1, count: 0 },
    sortable: toArray(raw.sortable),
    filtersDefs: toArray(raw.filtersDefs ?? raw.filters_defs),
    generalActions: toArray(raw.generalActions ?? raw.general_actions),
    columnDefs: toArray(raw.columnDefs ?? raw.column_defs)
  };
}

interface UseGenericListControllerOptions<T extends GenericRecord> {
  fetcher: Fetcher<T>;
  rowKey?: keyof T | ((row: T) => string);
  initialPerPage?: number;
  /** Column properties to exclude from backend response */
  disabledColumns?: string[];
  /** Filter keys to exclude from backend response */
  disabledFilters?: string[];
  /**
   * When provided, list state (filters, search, sort, page, perPage) is
   * persisted in the global store under this key and restored on remount.
   * Use the route path, e.g. '/app/clients'.
   */
  stateKey?: string;
}

/**
 * Hook do zarządzania stanem generycznej listy
 * Obsługuje: paginację, wyszukiwanie, sortowanie, filtry, selekcję
 */
export function useGenericListController<T extends GenericRecord = GenericRecord>(
  options: UseGenericListControllerOptions<T>
): UseGenericListController<T> {
  const {
    fetcher,
    rowKey = 'id',
    initialPerPage = 10,
    disabledColumns,
    disabledFilters,
    stateKey
  } = options;

  // Stabilize array props — inline arrays passed as props create new references every render,
  // which would cause fetchData to change and trigger an infinite refetch loop.
  const disabledColumnsRef = useRef(disabledColumns);
  disabledColumnsRef.current = disabledColumns;
  const stableDisabledColumns = useMemo(
    () => disabledColumnsRef.current,
    [JSON.stringify(disabledColumns)]
  );

  const disabledFiltersRef = useRef(disabledFilters);
  disabledFiltersRef.current = disabledFilters;
  const stableDisabledFilters = useMemo(
    () => disabledFiltersRef.current,
    [JSON.stringify(disabledFilters)]
  );

  const { getListState, saveListState } = useListStateStore();

  // Restore previously saved state if stateKey is provided
  const saved = stateKey ? getListState(stateKey) : undefined;

  // Data state
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(saved?.page ?? 1);
  const [perPage, setPerPage] = useState(saved?.perPage ?? initialPerPage);

  // Search
  const [search, setSearch] = useState(saved?.search ?? '');

  // Sort
  const [sortProperty, setSortProperty] = useState(saved?.sortProperty ?? 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(saved?.sortOrder ?? 'desc');

  // Filters
  const [filters, setFilters] = useState<FiltersState>(saved?.filters ?? {});

  // Persist list state whenever any relevant state changes
  useEffect(() => {
    if (!stateKey) return;
    saveListState(stateKey, { filters, search, sortProperty, sortOrder, page, perPage });
  }, [stateKey, saveListState, filters, search, sortProperty, sortOrder, page, perPage]);

  const hasAppliedInitialSort = useRef(!!saved?.sortProperty);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Helper to get row ID
  const getRowId = useCallback(
    (row: T): string => {
      if (typeof rowKey === 'function') {
        return rowKey(row);
      }
      const value = row[rowKey];
      return String(value ?? '');
    },
    [rowKey]
  );

  // Computed: active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== undefined && v !== null;
    }).length;
  }, [filters]);

  // Computed: selected rows
  const selectedRows = useMemo(() => {
    return data.filter((row) => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  // Computed: selection state
  const allSelected = useMemo(() => {
    return data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const someSelected = useMemo(() => {
    return data.some((row) => selectedIds.has(getRowId(row))) && !allSelected;
  }, [data, selectedIds, getRowId, allSelected]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetcher({
        page,
        perPage,
        search,
        sortProperty,
        sortOrder,
        filters,
        disabledColumns: stableDisabledColumns,
        disabledFilters: stableDisabledFilters
      });

      const normalizedMeta = normalizeMeta(response.meta);
      setData(response.data);
      setMeta(normalizedMeta);

      // Set initial sort from meta if available
      if (!hasAppliedInitialSort.current && normalizedMeta.sortable.length > 0) {
        const defaultSort = normalizedMeta.sortable[0];
        setSortProperty(defaultSort.property);
        setSortOrder(defaultSort.order);
        hasAppliedInitialSort.current = true;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Wystąpił błąd podczas pobierania danych';
      setError(message);
      setData([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [
    fetcher,
    page,
    perPage,
    search,
    sortProperty,
    sortOrder,
    filters,
    stableDisabledColumns,
    stableDisabledFilters
  ]);

  // Initial fetch and refetch on params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page
  }, []);

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page
  }, []);

  const handleSetSort = useCallback((property: string, order: 'asc' | 'desc') => {
    setSortProperty(property);
    setSortOrder(order);
    setPage(1); // Reset to first page
  }, []);

  const handleSetFilter = useCallback((key: string, value: string | string[]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
    setPage(1); // Reset to first page
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const handleToggleRowSelection = useCallback(
    (row: T) => {
      const id = getRowId(row);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [getRowId]
  );

  const handleToggleAllSelection = useCallback(() => {
    if (allSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        data.forEach((row) => next.delete(getRowId(row)));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        data.forEach((row) => next.add(getRowId(row)));
        return next;
      });
    }
  }, [allSelected, data, getRowId]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    // State
    data,
    meta,
    loading,
    error,
    page,
    perPage,
    search,
    sortProperty,
    sortOrder,
    filters,
    activeFiltersCount,
    selectedRows,
    selectedIds,
    allSelected,
    someSelected,

    // Actions
    setPage: handleSetPage,
    setPerPage: handleSetPerPage,
    setSearch: handleSetSearch,
    setSort: handleSetSort,
    setFilter: handleSetFilter,
    clearFilters: handleClearFilters,
    toggleRowSelection: handleToggleRowSelection,
    toggleAllSelection: handleToggleAllSelection,
    clearSelection: handleClearSelection,
    refetch: fetchData
  };
}

export default useGenericListController;
