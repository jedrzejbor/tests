import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Stack,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Typography,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Menu,
  Drawer,
  IconButton,
  Divider,
  InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useGenericListController } from '@/hooks/useGenericListController';
import { ListToolbar } from './ListToolbar';
import { DesktopTableRenderer } from './DesktopTableRenderer';
import { MobileCardListRenderer } from './MobileCardListRenderer';
import PageTitle from '@/components/PageTitle';
import type {
  GenericRecord,
  GenericListViewProps,
  RowHandler,
  GeneralHandler,
  FiltersState
} from '@/types/genericList';
import { normalizeFilterOptions } from '@/types/genericList';

export const GenericListView = <T extends GenericRecord = GenericRecord>({
  title,
  fetcher,
  handlers,
  bulkActions,
  bulkHandlers,
  rowKey = 'id',
  initialPerPage = 10,
  refreshKey,
  extraRowActions = [],
  disabledColumns,
  disabledFilters,
  stateKey
}: GenericListViewProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for menus and drawers
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Draft filter state — applied only when user clicks "Zastosuj"
  const [draftFilters, setDraftFilters] = useState<FiltersState>({});

  // Initialize controller
  const controller = useGenericListController<T>({
    fetcher,
    rowKey,
    initialPerPage,
    disabledColumns,
    disabledFilters,
    stateKey
  });

  const {
    data,
    meta,
    loading,
    error,
    page,
    search,
    sortProperty,
    sortOrder,
    filters,
    activeFiltersCount,
    selectedRows,
    selectedIds,
    allSelected,
    someSelected,
    setPage,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    refetch
  } = controller;

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setSearch(searchInput);
    }, 500);

    return () => window.clearTimeout(debounceId);
  }, [searchInput, setSearch]);

  useEffect(() => {
    if (refreshKey === undefined) return;
    refetch();
  }, [refreshKey, refetch]);

  // Sync draft filters from controller state when drawer opens
  useEffect(() => {
    if (filterDrawerOpen) {
      setDraftFilters(filters);
    }
  }, [filterDrawerOpen]); // intentionally omit `filters` - we only want to snapshot on open

  // Calculate selected count
  const selectedCount = selectedIds.size;

  // Get row ID helper
  const getRowId = useCallback(
    (row: T): string => {
      if (typeof rowKey === 'function') {
        return rowKey(row);
      }
      const value = row[rowKey as keyof T];
      return String(value ?? '');
    },
    [rowKey]
  );

  // Handle general actions (header buttons like "Add")
  const handleGeneralAction = useCallback(
    (handlerName: string) => {
      const handler = handlers[handlerName] as GeneralHandler | undefined;
      if (handler) {
        handler();
      } else {
        console.warn(`Handler not found: ${handlerName}`);
      }
    },
    [handlers]
  );

  // Handle row actions
  const handleRowAction = useCallback(
    (handlerName: string, row: T) => {
      const handler = handlers[handlerName] as RowHandler<T> | undefined;
      if (handler) {
        handler(row);
      } else {
        console.warn(`Handler not found: ${handlerName}`);
      }
    },
    [handlers]
  );

  // Handle bulk actions
  const handleBulkAction = useCallback(
    (handlerName: string) => {
      const handler = bulkHandlers?.[handlerName];
      if (handler) {
        handler(selectedRows);
        clearSelection();
      } else {
        console.warn(`Bulk handler not found: ${handlerName}`);
      }
    },
    [bulkHandlers, selectedRows, clearSelection]
  );

  // Memoized pagination info
  const paginationInfo = useMemo(() => {
    if (!meta?.pagination) return null;
    const { count, pages } = meta.pagination;
    return { count, pages };
  }, [meta?.pagination]);

  // Error state
  if (error) {
    return (
      <Box>
        <PageTitle>{title}</PageTitle>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Spróbuj ponownie
            </Button>
          }
          sx={{ mt: 2 }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Title removed for mobile - using inner wrapper title */}

      {/* Desktop: White container with title, toolbar, table, and pagination */}
      {!isMobile && meta ? (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)',
            minHeight: '600px'
          }}
        >
          {/* Header section with title and toolbar */}
          <Box sx={{ p: 3, pb: 2 }}>
            {/* Title row with Add button */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontSize: '32px',
                  fontWeight: 300,
                  lineHeight: '44px',
                  color: '#1E1F21'
                }}
              >
                {title}
              </Typography>

              {/* Add button from general actions or default "create-user" handler */}
              {(() => {
                const generalActions = meta?.generalActions || [];
                // Show only generalActions from backend (includes create-user / create-client etc.)
                const actionsToShow = generalActions;

                return actionsToShow
                  .filter((action) => action.type === 'button_primary')
                  .map((action) => (
                    <Button
                      key={action.handler}
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      onClick={() => handleGeneralAction(action.handler)}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '8px',
                        fontWeight: 500,
                        fontSize: '14px',
                        px: 2.5,
                        bgcolor: '#1E1F21',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#32343A'
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ));
              })()}
            </Stack>

            {/* Search and Filter/Sort buttons */}
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* Search */}
              <TextField
                placeholder="Szukaj"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="small"
                sx={{
                  width: 300,
                  bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#E5E7EB'
                    },
                    '&:hover fieldset': {
                      borderColor: '#D0D5DD'
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#8E9098', fontSize: 20 }} />
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ flex: 1 }} />

              {/* Filter button */}
              <Button
                startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                onClick={() => setFilterDrawerOpen(true)}
                variant="outlined"
                sx={{
                  color: '#32343A',
                  textTransform: 'none',
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 2,
                  bgcolor: 'white',
                  '&:hover': {
                    borderColor: '#D0D5DD',
                    bgcolor: '#FAFAFA'
                  }
                }}
                endIcon={
                  activeFiltersCount > 0 ? (
                    <Box
                      sx={{
                        bgcolor: '#1E1F21',
                        color: 'white',
                        borderRadius: '4px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 0.5
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '12px',
                          fontWeight: 500,
                          lineHeight: '20px'
                        }}
                      >
                        {activeFiltersCount}
                      </Typography>
                    </Box>
                  ) : null
                }
              >
                Filtry
              </Button>

              {/* Sort button */}
              <Button
                startIcon={<SortIcon sx={{ fontSize: 18 }} />}
                onClick={(e) => setSortAnchorEl(e.currentTarget)}
                variant="outlined"
                sx={{
                  color: '#32343A',
                  textTransform: 'none',
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 2,
                  bgcolor: 'white',
                  '&:hover': {
                    borderColor: '#D0D5DD',
                    bgcolor: '#FAFAFA'
                  }
                }}
              >
                Sortuj
              </Button>
            </Stack>

            {/* Bulk actions row - show only when items selected */}
            {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedCount} pozycje zaznaczone
                </Typography>
                <Stack direction="row" spacing={1}>
                  {bulkActions.map((action) => (
                    <Button
                      key={action.handler}
                      variant="outlined"
                      size="small"
                      startIcon={action.icon}
                      onClick={() => handleBulkAction(action.handler)}
                      sx={{ textTransform: 'none' }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            )}
          </Box>

          {/* Scrollable table section */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 3
            }}
          >
            <DesktopTableRenderer
              columns={meta.columnDefs}
              data={data}
              loading={loading}
              selectedIds={selectedIds}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleRowSelection={toggleRowSelection}
              onToggleAllSelection={toggleAllSelection}
              onRowAction={handleRowAction}
              getRowId={getRowId}
              extraRowActions={extraRowActions}
            />
          </Box>

          {/* Pagination section - fixed at bottom */}
          {paginationInfo && paginationInfo.pages > 1 && (
            <Box
              sx={{
                px: 3,
                py: 2.5,
                borderTop: '1px solid #F0F0F0',
                bgcolor: 'white',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              <Pagination
                count={paginationInfo.pages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                siblingCount={1}
                boundaryCount={1}
                sx={{
                  '& .MuiPagination-ul': {
                    gap: '2px'
                  },
                  '& .MuiPaginationItem-root': {
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#80828D',
                    borderRadius: '8px',
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    margin: 0,
                    border: 'none',
                    '&.Mui-selected': {
                      bgcolor: 'transparent',
                      color: '#1E1F21',
                      border: '1px solid #D0D5DD',
                      '&:hover': {
                        bgcolor: 'transparent',
                        border: '1px solid #D0D5DD'
                      }
                    },
                    '&:hover': {
                      bgcolor: 'transparent'
                    }
                  },
                  '& .MuiPaginationItem-ellipsis': {
                    color: '#80828D',
                    fontWeight: 500
                  },
                  '& .MuiPaginationItem-previousNext': {
                    padding: '8px',
                    minWidth: 'auto',
                    width: 'auto',
                    height: 'auto',
                    borderRadius: '8px',
                    '&:hover': {
                      bgcolor: '#F9FAFB'
                    }
                  }
                }}
              />
            </Box>
          )}

          {/* Sort Menu */}
          <Menu
            anchorEl={sortAnchorEl}
            open={Boolean(sortAnchorEl)}
            onClose={() => setSortAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                bgcolor: 'white',
                // borderRadius: '8px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: 200,
                mt: 0.5
              }
            }}
          >
            {meta?.sortable.map((sort, index) => (
              <MenuItem
                key={`${sort.property}-${sort.order}-${index}`}
                onClick={() => {
                  setSort(sort.property, sort.order);
                  setSortAnchorEl(null);
                }}
                selected={sort.property === sortProperty && sort.order === sortOrder}
                sx={{
                  fontSize: '14px',
                  py: 1.5,
                  px: 2,
                  position: 'relative',
                  '&:hover': {
                    bgcolor: '#F9FAFB'
                  },
                  '&.Mui-selected': {
                    bgcolor: '#F9FAFB',
                    '&:hover': {
                      bgcolor: '#F9FAFB'
                    }
                  },
                  '&::after':
                    index < meta.sortable.length - 1
                      ? {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: '16px',
                          right: '16px',
                          height: '1px',
                          bgcolor: 'rgba(0, 0, 0, 0.12)'
                        }
                      : {}
                }}
              >
                {sort.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Filter Drawer */}
          <Drawer
            anchor="right"
            open={filterDrawerOpen}
            onClose={() => setFilterDrawerOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                p: 3,
                bgcolor: 'white'
              }
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6">Filtry</Typography>
              <IconButton onClick={() => setFilterDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            {/* Render filter inputs — changes are buffered in draftFilters */}
            {meta?.filtersDefs.map((filterDef) => {
              const currentValue = draftFilters[filterDef.key] || (filterDef.is_multiple ? [] : '');

              if (filterDef.type === 'select') {
                // Normalize options from any backend format
                const optionsArray = normalizeFilterOptions(filterDef.options);

                return (
                  <FormControl key={filterDef.key} fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>{filterDef.label}</InputLabel>
                    <Select
                      value={currentValue}
                      label={filterDef.label}
                      multiple={filterDef.is_multiple}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          [filterDef.key]: e.target.value as string | string[]
                        }))
                      }
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: 'white',
                            boxShadow:
                              '0px 4px 6px -2px rgba(0, 0, 0, 0.05), 0px 10px 15px -3px rgba(0, 0, 0, 0.10)'
                          }
                        }
                      }}
                    >
                      {optionsArray.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }

              return (
                <TextField
                  key={filterDef.key}
                  label={filterDef.label}
                  value={currentValue}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, [filterDef.key]: e.target.value }))
                  }
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
              );
            })}

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setDraftFilters({});
                  clearFilters();
                  setFilterDrawerOpen(false);
                }}
              >
                Wyczyść
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  // Apply all draft filters at once
                  Object.entries(draftFilters).forEach(([key, value]) => setFilter(key, value));
                  // Clear any previously set keys not present in draft
                  Object.keys(filters).forEach((key) => {
                    if (!(key in draftFilters)) setFilter(key, '');
                  });
                  setFilterDrawerOpen(false);
                }}
              >
                Zastosuj
              </Button>
            </Stack>
          </Drawer>
        </Box>
      ) : (
        <>
          {/* Mobile layout - white wrapper */}
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              p: 2,
              mb: '76px' /* leave space for bottom navigation on mobile */
            }}
          >
            {/* Title + Add button in same row */}
            {meta && (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: '20px',
                    fontWeight: 300,
                    lineHeight: '28px',
                    color: '#1E1F21'
                  }}
                >
                  {title}
                </Typography>

                {meta.generalActions
                  .filter((action) => action.type === 'button_primary')
                  .map((action) => (
                    <Button
                      key={action.handler}
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      onClick={() => handleGeneralAction(action.handler)}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '8px',
                        fontWeight: 500,
                        fontSize: '14px',
                        px: 2,
                        bgcolor: '#1E1F21',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#32343A'
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
              </Stack>
            )}

            {meta && (
              <ListToolbar
                search={searchInput}
                onSearchChange={setSearchInput}
                sortable={meta.sortable}
                sortProperty={sortProperty}
                sortOrder={sortOrder}
                onSortChange={setSort}
                filtersDefs={meta.filtersDefs}
                filters={filters}
                activeFiltersCount={activeFiltersCount}
                onFilterChange={setFilter}
                onClearFilters={clearFilters}
                generalActions={[]} // Don't show general actions in toolbar - we show them above
                onGeneralAction={handleGeneralAction}
                bulkActions={bulkActions}
                selectedCount={selectedRows.length}
                onBulkAction={handleBulkAction}
              />
            )}

            <MobileCardListRenderer
              columns={meta?.columnDefs || []}
              data={data}
              loading={loading}
              onRowAction={handleRowAction}
              getRowId={getRowId}
              extraRowActions={extraRowActions}
            />

            {/* Mobile Pagination */}
            {paginationInfo && paginationInfo.pages > 1 && (
              <Stack direction="column" alignItems="center" spacing={2} sx={{ mt: 3 }}>
                <Pagination
                  count={paginationInfo.pages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  shape="rounded"
                />
              </Stack>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default GenericListView;
