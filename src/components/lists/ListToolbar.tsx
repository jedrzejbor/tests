import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Typography,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import type {
  SortDef,
  FilterDef,
  GeneralActionDef,
  FiltersState,
  BulkAction
} from '@/types/genericList';
import { normalizeFilterOptions } from '@/types/genericList';

interface ListToolbarProps {
  // Search
  search: string;
  onSearchChange: (value: string) => void;

  // Sort
  sortable: SortDef[];
  sortProperty: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (property: string, order: 'asc' | 'desc') => void;

  // Filters
  filtersDefs: FilterDef[];
  filters: FiltersState;
  activeFiltersCount: number;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearFilters: () => void;

  // General Actions
  generalActions: GeneralActionDef[];
  onGeneralAction: (handler: string) => void;

  // Bulk Actions
  bulkActions?: BulkAction[];
  selectedCount: number;
  onBulkAction?: (handler: string) => void;

  /** Override filter labels by key */
  filterLabelOverrides?: Record<string, string>;
  /** Tooltips shown next to filter labels by key */
  filterTooltips?: Record<string, string>;
  /** Transform display value to backend value before sending (e.g. PLN → grosze) */
  filterTransformers?: Record<string, (displayValue: string) => string>;
  mobileVariant?: 'default' | 'policy';
}

export const ListToolbar = ({
  search,
  onSearchChange,
  sortable,
  sortProperty,
  sortOrder,
  onSortChange,
  filtersDefs,
  filters,
  activeFiltersCount,
  onFilterChange,
  onClearFilters,
  generalActions,
  onGeneralAction,
  bulkActions,
  selectedCount,
  onBulkAction,
  filterLabelOverrides,
  filterTooltips,
  filterTransformers,
  mobileVariant = 'default'
}: ListToolbarProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Sort menu state
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const sortMenuOpen = Boolean(sortAnchorEl);

  // Filter drawer state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Note: removed unused dynamic sort label — using fixed "Sortuj" on mobile

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (sort: SortDef) => {
    onSortChange(sort.property, sort.order);
    handleSortClose();
  };

  const handleFilterDrawerToggle = () => {
    setFilterDrawerOpen(!filterDrawerOpen);
  };

  // Helper: build filter label with optional tooltip
  const renderFilterLabel = (filterDef: FilterDef) => {
    const label = filterLabelOverrides?.[filterDef.key] ?? filterDef.label;
    const tooltip = filterTooltips?.[filterDef.key];
    if (!tooltip) return label;
    return (
      <Stack direction="row" alignItems="center" spacing={0.5} component="span">
        <span>{label}</span>
        <Tooltip title={tooltip} arrow placement="top">
          <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
        </Tooltip>
      </Stack>
    );
  };

  // Detect if a range filter should use date inputs (based on key name)
  const isDateRangeFilter = (filterDef: FilterDef) =>
    filterDef.type === 'date_range' || (filterDef.type === 'range' && /date/i.test(filterDef.key));

  // Render filter inputs based on filtersDefs
  const renderFilterInputs = () => {
    return filtersDefs.map((filterDef) => {
      const currentValue = filters[filterDef.key] || (filterDef.is_multiple ? [] : '');
      const label = filterLabelOverrides?.[filterDef.key] ?? filterDef.label;

      // Date range filter — two date inputs
      if (isDateRangeFilter(filterDef)) {
        const rangeStr = typeof currentValue === 'string' ? currentValue : '';
        const [rangeFrom = '', rangeTo = ''] = rangeStr.split(',');
        const updateRange = (from: string, to: string) => {
          const val = from || to ? `${from},${to}` : '';
          onFilterChange(filterDef.key, val);
        };
        return (
          <Box key={filterDef.key} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              {renderFilterLabel(filterDef)}
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Od"
                value={rangeFrom}
                onChange={(e) => updateRange(e.target.value, rangeTo)}
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Do"
                value={rangeTo}
                onChange={(e) => updateRange(rangeFrom, e.target.value)}
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Box>
        );
      }

      if (filterDef.type === 'select') {
        // Normalize options from any backend format
        const optionsArray = normalizeFilterOptions(filterDef.options);

        return (
          <FormControl key={filterDef.key} fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{label}</InputLabel>
            <Select
              value={currentValue}
              label={label}
              multiple={filterDef.is_multiple}
              onChange={(e) => onFilterChange(filterDef.key, e.target.value as string | string[])}
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

      // Range filter — two numeric inputs (from, to) joined by comma
      if (filterDef.type === 'range') {
        const rangeStr = typeof currentValue === 'string' ? currentValue : '';
        const [rangeFrom = '', rangeTo = ''] = rangeStr.split(',');
        const hasTransformer = !!filterTransformers?.[filterDef.key];
        const updateRange = (from: string, to: string) => {
          const val = from || to ? `${from},${to}` : '';
          onFilterChange(filterDef.key, val);
        };
        return (
          <Box key={filterDef.key} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              {renderFilterLabel(filterDef)}
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Od"
                value={rangeFrom}
                onChange={(e) => updateRange(e.target.value, rangeTo)}
                type="number"
                fullWidth
                size="small"
                inputProps={hasTransformer ? { step: '0.01', min: '0' } : undefined}
              />
              <TextField
                label="Do"
                value={rangeTo}
                onChange={(e) => updateRange(rangeFrom, e.target.value)}
                type="number"
                fullWidth
                size="small"
                inputProps={hasTransformer ? { step: '0.01', min: '0' } : undefined}
              />
            </Stack>
          </Box>
        );
      }

      // Default text input
      return (
        <TextField
          key={filterDef.key}
          label={label}
          value={currentValue}
          onChange={(e) => onFilterChange(filterDef.key, e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
        />
      );
    });
  };

  // Mobile layout
  if (isMobile) {
    const isPolicyMobile = mobileVariant === 'policy';

    return (
      <Box sx={{ mb: isPolicyMobile ? 3 : 2 }}>
        {/* Title row with add button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          {/* General Actions (mobile: just primary action) */}
          {generalActions.length > 0 && (
            <Box sx={{ ml: 'auto' }}>
              {generalActions
                .filter((action) => action.type === 'button_primary')
                .map((action) => (
                  <Button
                    key={action.handler}
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => onGeneralAction(action.handler)}
                    sx={{ bgcolor: '#1E1F21', '&:hover': { bgcolor: '#32343A' } }}
                  >
                    {action.label}
                  </Button>
                ))}
            </Box>
          )}
        </Stack>

        {/* Search input */}
        <TextField
          placeholder="Szukaj"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#8E9098', fontSize: 20 }} />
              </InputAdornment>
            )
          }}
          sx={{
            mb: isPolicyMobile ? 1 : 2,
            bgcolor: 'background.paper',
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              height: isPolicyMobile ? '44px' : undefined,
              fontSize: isPolicyMobile ? '16px' : undefined,
              lineHeight: isPolicyMobile ? '20px' : undefined,
              '& fieldset': {
                borderColor: isPolicyMobile ? '#D0D5DD' : '#E5E7EB'
              }
            },
            '& .MuiInputBase-input::placeholder': {
              color: '#74767F',
              opacity: 1
            }
          }}
        />

        {/* Sort and Filter row */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={isPolicyMobile ? 'space-between' : 'flex-start'}
          sx={{ mb: isPolicyMobile ? 0 : 2, gap: 2 }}
        >
          {/* Sort button (Alfabetycznie) */}
          <Button
            variant="outlined"
            startIcon={<SortIcon sx={{ fontSize: isPolicyMobile ? 24 : 18 }} />}
            onClick={handleSortClick}
            sx={{
              color: '#1E1F21',
              textTransform: 'none',
              borderColor: isPolicyMobile ? '#D0D5DD' : '#E5E7EB',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '24px',
              letterSpacing: '0.4px',
              justifyContent: 'center',
              px: isPolicyMobile ? '22px' : '16px',
              py: isPolicyMobile ? '8px' : '12px',
              bgcolor: 'white',
              width: isPolicyMobile ? '119px' : 'auto',
              height: isPolicyMobile ? '44px' : undefined,
              minWidth: 0,
              boxShadow: isPolicyMobile ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
              '&:hover': {
                borderColor: '#D0D5DD',
                bgcolor: '#FAFAFA'
              }
            }}
          >
            Sortuj
          </Button>

          {/* spacer to push Filter button to the right */}
          {!isPolicyMobile && <Box sx={{ flex: 1 }} />}

          {/* Filter button */}
          <Button
            variant="outlined"
            startIcon={<FilterListIcon sx={{ fontSize: isPolicyMobile ? 24 : 18 }} />}
            onClick={handleFilterDrawerToggle}
            sx={{
              color: '#1E1F21',
              textTransform: 'none',
              borderColor: isPolicyMobile ? '#D0D5DD' : '#E5E7EB',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '24px',
              letterSpacing: '0.4px',
              justifyContent: 'center',
              px: isPolicyMobile ? '18px' : '16px',
              py: isPolicyMobile ? '8px' : '12px',
              bgcolor: 'white',
              width: isPolicyMobile ? '122px' : 'auto',
              height: isPolicyMobile ? '44px' : undefined,
              minWidth: 0,
              boxShadow: isPolicyMobile ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
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
                    justifyContent: 'center'
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
        </Stack>

        {/* Bulk actions bar (when items selected) */}
        {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#F5F5F5', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedCount} pozycji zaznaczonych
            </Typography>
            <Stack direction="row" spacing={1}>
              {bulkActions.map((action) => (
                <Button
                  key={action.handler}
                  variant={action.variant === 'primary' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => onBulkAction?.(action.handler)}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* Sort Menu */}
        <Menu
          anchorEl={sortAnchorEl}
          open={sortMenuOpen}
          onClose={handleSortClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          PaperProps={{
            sx: {
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 180
            }
          }}
        >
          {sortable.map((sort, index) => (
            <MenuItem
              key={`${sort.property}-${sort.order}-${index}`}
              onClick={() => handleSortSelect(sort)}
              selected={sort.property === sortProperty && sort.order === sortOrder}
              sx={{
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
                  index < sortable.length - 1
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
          anchor="bottom"
          open={filterDrawerOpen}
          onClose={handleFilterDrawerToggle}
          sx={{
            zIndex: (theme) => theme.zIndex.modal + 200,
            '& .MuiDrawer-paper': {
              bgcolor: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              p: 3,
              maxHeight: '80vh'
            }
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Filtry</Typography>
            <IconButton onClick={handleFilterDrawerToggle}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {renderFilterInputs()}

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={2}>
            <Button variant="outlined" fullWidth onClick={onClearFilters}>
              Wyczyść
            </Button>
            <Button variant="contained" fullWidth onClick={handleFilterDrawerToggle}>
              Zastosuj
            </Button>
          </Stack>
        </Drawer>
      </Box>
    );
  }

  // Desktop layout
  return (
    <Box>
      {/* Top row: Search + Sort + Filter + Actions */}
      <Stack direction="row" alignItems="center" spacing={2}>
        {/* Search */}
        <TextField
          placeholder="Szukaj"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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

        {/* Filter button with badge */}
        <Button
          startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
          onClick={handleFilterDrawerToggle}
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
          onClick={handleSortClick}
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

        {/* General Actions */}
        {generalActions.map((action) => (
          <Button
            key={action.handler}
            variant={action.type === 'button_primary' ? 'contained' : 'outlined'}
            startIcon={
              action.type === 'button_primary' ? <AddIcon sx={{ fontSize: 18 }} /> : undefined
            }
            onClick={() => onGeneralAction(action.handler)}
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              px: 2.5,
              ...(action.type === 'button_primary'
                ? {
                    bgcolor: '#1E1F21',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#32343A'
                    }
                  }
                : {
                    borderColor: '#E5E7EB',
                    color: '#32343A',
                    bgcolor: 'white',
                    '&:hover': {
                      borderColor: '#D0D5DD',
                      bgcolor: '#FAFAFA'
                    }
                  })
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      {/* Bulk actions row */}
      {(selectedCount > 0 || (bulkActions && bulkActions.length > 0)) && (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
          {/* Bulk action buttons */}
          {bulkActions && bulkActions.length > 0 && selectedCount > 0 && (
            <Stack direction="row" spacing={1}>
              {bulkActions.map((action) => (
                <Button
                  key={action.handler}
                  variant="outlined"
                  size="small"
                  startIcon={action.icon}
                  onClick={() => onBulkAction?.(action.handler)}
                  sx={{ textTransform: 'none' }}
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Selected count */}
          {selectedCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {selectedCount} pozycje zaznaczone
            </Typography>
          )}
        </Stack>
      )}

      {/* Active filters chips */}
      {activeFiltersCount > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            const filterDef = filtersDefs.find((f) => f.key === key);
            const label = filterDef?.label || key;
            const displayValue = Array.isArray(value) ? value.join(', ') : value;

            return (
              <Chip
                key={key}
                label={`${label}: ${displayValue}`}
                onDelete={() => onFilterChange(key, filterDef?.is_multiple ? [] : '')}
                size="small"
                sx={{ mb: 1 }}
              />
            );
          })}
          <Chip
            label="Wyczyść wszystkie"
            onClick={onClearFilters}
            size="small"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        </Stack>
      )}

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={sortMenuOpen}
        onClose={handleSortClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 180,
              overflow: 'visible'
            }
          }
        }}
      >
        {sortable.map((sort, index) => (
          <MenuItem
            key={`${sort.property}-${sort.order}-${index}`}
            onClick={() => handleSortSelect(sort)}
            selected={sort.property === sortProperty && sort.order === sortOrder}
            sx={{
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
                index < sortable.length - 1
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

      {/* Filter Drawer (desktop - right side) */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={handleFilterDrawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: '#FFFFFF',
            width: 320,
            p: 3
          }
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6">Filtry</Typography>
          <IconButton onClick={handleFilterDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {renderFilterInputs()}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" fullWidth onClick={onClearFilters}>
            Wyczyść
          </Button>
          <Button variant="contained" fullWidth onClick={handleFilterDrawerToggle}>
            Zastosuj
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
};

export default ListToolbar;
