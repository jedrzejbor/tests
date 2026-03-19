import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  GenericRecord,
  Fetcher,
  FiltersState,
  ListMeta,
  UseGenericListController
} from '@/types/genericList';

interface UseGenericListControllerOptions<T extends GenericRecord> {
  fetcher: Fetcher<T>;
  rowKey?: keyof T | ((row: T) => string);
  initialPerPage?: number;
  /** Column properties to exclude from backend response */
  disabledColumns?: string[];
  /** Filter keys to exclude from backend response */
  disabledFilters?: string[];
}

/**
 * Hook do zarządzania stanem generycznej listy
 * Obsługuje: paginację, wyszukiwanie, sortowanie, filtry, selekcję
 */
export function useGenericListController<T extends GenericRecord = GenericRecord>(
  options: UseGenericListControllerOptions<T>
): UseGenericListController<T> {
  const { fetcher, rowKey = 'id', initialPerPage = 10, disabledColumns, disabledFilters } = options;

  // Data state
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  // Search
  const [search, setSearch] = useState('');

  // Sort
  const [sortProperty, setSortProperty] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [filters, setFilters] = useState<FiltersState>({});

  const hasAppliedInitialSort = useRef(false);

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
        disabledColumns,
        disabledFilters
      });

      setData(response.data);
      setMeta(response.meta);

      // Set initial sort from meta if available
      if (!hasAppliedInitialSort.current && response.meta.sortable.length > 0) {
        const defaultSort = response.meta.sortable[0];
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
    disabledColumns,
    disabledFilters
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
