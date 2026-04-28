import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  Menu,
  MenuItem,
  Divider,
  Tooltip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ColumnDef, GenericRecord, ActionDef, ExtraRowAction } from '@/types/genericList';

/**
 * Extract tooltip items from row meta for a given column property.
 * Backend sends content as either [] (empty array) or { "1": "...", "2": "..." } (object).
 */
const getTooltipItems = (row: GenericRecord, property: string | null): string[] => {
  if (!property) return [];
  const meta = row.meta as
    | { columns?: Record<string, { tooltip?: { content?: unknown } }> }
    | undefined;
  const content = meta?.columns?.[property]?.tooltip?.content;
  if (!content) return [];
  if (Array.isArray(content)) return content.filter((v): v is string => typeof v === 'string');
  if (typeof content === 'object' && content !== null) {
    return Object.values(content as Record<string, string>).filter(
      (v): v is string => typeof v === 'string'
    );
  }
  return [];
};

interface MobileCardListRendererProps<T extends GenericRecord = GenericRecord> {
  columns: ColumnDef[];
  data: T[];
  loading: boolean;
  onRowAction: (handler: string, row: T) => void;
  getRowId: (row: T) => string;
  /** Frontend-defined actions appended after backend actions in the kebab menu */
  extraRowActions?: ExtraRowAction<T>[];
  variant?: 'default' | 'policy';
}

// Get status chip styles
const getStatusChipStyles = (status: string) => {
  const lowerStatus = status?.toLowerCase() || '';
  if (
    lowerStatus.includes('nieaktywny') ||
    lowerStatus.includes('inactive') ||
    lowerStatus.includes('archiwalny')
  ) {
    return {
      bgcolor: '#FEF3F2',
      color: '#B42318',
      dotColor: '#F04438'
    };
  }
  if (lowerStatus.includes('aktywny') || lowerStatus.includes('active')) {
    return {
      bgcolor: '#E8F5E9',
      color: '#2E7D32',
      dotColor: '#4CAF50'
    };
  }
  if (lowerStatus.includes('pending') || lowerStatus.includes('oczekuje')) {
    return {
      bgcolor: '#FFFAEB',
      color: '#B54708',
      dotColor: '#F79009'
    };
  }
  return {
    bgcolor: '#F2F4F7',
    color: '#344054',
    dotColor: '#667085'
  };
};

const getStringValue = (row: GenericRecord, property: string): string => {
  const value = row[property];
  return value === undefined || value === null ? '' : String(value).trim();
};

const formatDateToken = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
};

const formatPolicyDateRange = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (/^od:/i.test(normalized)) return normalized;

  const [from, to] = normalized.split(/\s+(?:-|–|—|do)\s+/i);
  if (!from || !to) return normalized;

  return `Od: ${formatDateToken(from)} Do: ${formatDateToken(to)}`;
};

export const MobileCardListRenderer = <T extends GenericRecord = GenericRecord>({
  columns,
  data,
  loading,
  onRowAction,
  getRowId,
  extraRowActions = [],
  variant = 'default'
}: MobileCardListRendererProps<T>) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<T | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: T) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRow(row);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuRow(null);
  };

  const handleMenuAction = (handler: string) => {
    if (menuRow) {
      onRowAction(handler, menuRow);
    }
    handleMenuClose();
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {[...Array(3)].map((_, index) => (
          <Box
            key={index}
            sx={{ p: 2, borderBottom: index < 2 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none' }}
          >
            <Stack spacing={1}>
              <Skeleton width="60%" height={24} />
              <Skeleton width="40%" height={20} />
              <Stack direction="row" spacing={1}>
                <Skeleton width={80} height={24} />
                <Skeleton width={60} height={24} />
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          textAlign: 'center',
          py: 8,
          px: 3
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Brak danych do wyświetlenia
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Spróbuj zmienić filtry lub dodaj nowe rekordy
        </Typography>
      </Box>
    );
  }

  // Find title column (full_name, name, or first text column)
  const titleColumn =
    columns.find((c) => c.type === 'full_name') ||
    columns.find((c) => c.property === 'name') ||
    columns.find((c) => c.type === 'text');

  // Find subtitle column (company, parent_client, or position)
  const subtitleColumn = columns.find(
    (c) => c.property === 'company' || c.property === 'parent_client' || c.property === 'position'
  );

  // Find email or child_client column
  const emailColumn = columns.find((c) => c.property === 'email' || c.property === 'child_client');

  // Find phone or nip column
  const phoneColumn = columns.find((c) => c.property === 'phone' || c.property === 'nip');

  // Find status column
  const statusColumn = columns.find((c) => c.type === 'status' || c.property === 'status');

  // Find account_type, type, or authority_scope column
  const accountTypeColumn = columns.find(
    (c) =>
      c.property === 'account_type' || c.property === 'type' || c.property === 'authority_scope'
  );

  return (
    <>
      {/* White container for the list */}
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {data.map((row, index) => {
          const rowId = getRowId(row);
          const rowActions = (row.actions as ActionDef[]) || [];
          const visibleExtraActions = extraRowActions.filter((ea) => !ea.show || ea.show(row));
          const isLast = index === data.length - 1;

          if (variant === 'policy') {
            const client = getStringValue(row, 'client');
            const dateRange = formatPolicyDateRange(getStringValue(row, 'date_range'));
            const type = getStringValue(row, 'type');
            const insuranceCompany = getStringValue(row, 'insurance_company');
            const city = getStringValue(row, 'city');
            const number = getStringValue(row, 'number');
            const status = getStringValue(row, 'status');
            const hasActions = rowActions.length > 0 || visibleExtraActions.length > 0;

            return (
              <Box key={rowId}>
                <Box sx={{ px: 2, pt: 2, pb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography
                      sx={{
                        color: '#1E1F21',
                        fontSize: '16px',
                        fontWeight: 600,
                        lineHeight: 1.5,
                        letterSpacing: '0.15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        pr: 1
                      }}
                    >
                      {client || '—'}
                    </Typography>

                    {hasActions && (
                      <IconButton
                        aria-label="Akcje polisy"
                        onClick={(e) => handleMenuOpen(e, row)}
                        sx={{ color: '#1E1F21', p: 0.5, mt: -0.5, mr: -0.5 }}
                      >
                        <MoreVertIcon sx={{ fontSize: 24 }} />
                      </IconButton>
                    )}
                  </Stack>

                  <Stack spacing={0.5} sx={{ mt: 0 }}>
                    {dateRange && (
                      <Typography
                        sx={{
                          color: '#74767F',
                          fontSize: '14px',
                          lineHeight: 1.43,
                          letterSpacing: '0.17px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {dateRange}
                      </Typography>
                    )}
                    <Stack spacing={0}>
                      {[type, insuranceCompany, city].filter(Boolean).map((value) => (
                        <Typography
                          key={value}
                          sx={{
                            color: '#74767F',
                            fontSize: '14px',
                            lineHeight: 1.43,
                            letterSpacing: '0.17px',
                            width: '231px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {value}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>

                  {number && (
                    <Typography
                      sx={{
                        color: '#1E1F21',
                        fontSize: '16px',
                        fontWeight: 600,
                        lineHeight: 1.5,
                        letterSpacing: '0.15px',
                        mt: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Nr. polisy {number}
                    </Typography>
                  )}

                  {status && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '20px',
                        bgcolor: '#E8F5E9',
                        borderRadius: '16px',
                        pl: '8px',
                        pr: '2px',
                        py: '3px',
                        mt: 1,
                        width: 'fit-content'
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: '#4CAF50',
                          flexShrink: 0
                        }}
                      />
                      <Typography
                        component="span"
                        sx={{
                          color: '#2E7D32',
                          fontSize: '12px',
                          fontWeight: 400,
                          lineHeight: '14px',
                          letterSpacing: '0.16px',
                          whiteSpace: 'nowrap',
                          px: '6px'
                        }}
                      >
                        {status}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {!isLast && <Divider sx={{ mx: 2, borderColor: '#E0E0E0' }} />}
              </Box>
            );
          }

          // Get values
          const titleValue = titleColumn?.property ? String(row[titleColumn.property] || '') : '';
          const subtitleValue = subtitleColumn?.property
            ? String(row[subtitleColumn.property] || '')
            : '';
          const emailValue = emailColumn?.property ? String(row[emailColumn.property] || '') : '';
          const phoneValue = phoneColumn?.property ? String(row[phoneColumn.property] || '') : '';
          const cityValue = row.city ? String(row.city) : '';
          const statusValue = statusColumn?.property
            ? String(row[statusColumn.property] || '')
            : '';
          const accountTypeValue = accountTypeColumn?.property
            ? String(row[accountTypeColumn.property] || '')
            : '';

          const statusStyles = getStatusChipStyles(statusValue);

          return (
            <Box key={rowId}>
              <Box sx={{ p: 2 }}>
                {/* Header row: Title + Menu */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: '16px',
                      lineHeight: '24px',
                      color: '#1E1F21',
                      flex: 1,
                      pr: 1
                    }}
                  >
                    {titleValue || '—'}
                  </Typography>

                  {(rowActions.length > 0 || visibleExtraActions.length > 0) && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, row)}
                      sx={{ color: '#8E9098', mt: -0.5, mr: -1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {/* Subtitle - Company/Location */}
                {subtitleValue && (
                  <Typography
                    sx={{
                      color: '#74767F',
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      mt: 0.5
                    }}
                  >
                    {subtitleColumn?.label}: {subtitleValue}
                  </Typography>
                )}

                {/* Email / child_client */}
                {emailValue && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Typography
                      sx={{
                        color: '#74767F',
                        fontSize: '14px',
                        lineHeight: '20px',
                        fontWeight: 400
                      }}
                    >
                      {emailColumn?.label || 'Email'}: {emailValue}
                    </Typography>
                    {emailColumn?.property === 'child_client' &&
                      (() => {
                        const tooltipItems = getTooltipItems(row, 'child_client');
                        return tooltipItems.length > 0 ? (
                          <Tooltip
                            title={
                              <Box>
                                {tooltipItems.map((item, i) => (
                                  <Typography key={i} variant="body2" sx={{ fontSize: '13px' }}>
                                    {item}
                                  </Typography>
                                ))}
                              </Box>
                            }
                            arrow
                            enterTouchDelay={0}
                            leaveTouchDelay={3000}
                          >
                            <InfoOutlinedIcon
                              sx={{
                                fontSize: 16,
                                color: '#9CA3AF',
                                cursor: 'pointer',
                                '&:hover': { color: '#6B7280' }
                              }}
                            />
                          </Tooltip>
                        ) : null;
                      })()}
                  </Box>
                )}

                {/* Phone */}
                {phoneValue && (
                  <Typography
                    sx={{
                      color: '#74767F',
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      mt: 0.5
                    }}
                  >
                    {phoneColumn?.label || 'Telefon'}: {phoneValue}
                  </Typography>
                )}

                {/* City (for clients) */}
                {cityValue && (
                  <Typography
                    sx={{
                      color: '#74767F',
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      mt: 0.5
                    }}
                  >
                    Miasto: {cityValue}
                  </Typography>
                )}

                {/* Status and Account Type chips */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ mt: 1.5 }}
                >
                  {/* Status chip with dot */}
                  {statusValue && (
                    <Chip
                      size="small"
                      label={statusValue}
                      icon={
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: statusStyles.dotColor,
                            ml: 1
                          }}
                        />
                      }
                      sx={{
                        bgcolor: statusStyles.bgcolor,
                        color: statusStyles.color,
                        fontWeight: 500,
                        fontSize: '12px',
                        height: '24px',
                        borderRadius: '16px',
                        '& .MuiChip-icon': {
                          mr: '4px',
                          ml: 0
                        },
                        '& .MuiChip-label': {
                          px: 1,
                          pr: 1.5
                        }
                      }}
                    />
                  )}
                  {/* Account type chip */}
                  {accountTypeValue && (
                    <Chip
                      size="small"
                      label={accountTypeValue}
                      variant="outlined"
                      sx={{
                        borderRadius: '16px',
                        borderColor: '#D0D5DD',
                        color: '#344054',
                        fontWeight: 500,
                        fontSize: '12px',
                        height: '24px',
                        bgcolor: 'transparent',
                        '& .MuiChip-label': {
                          px: 1.5
                        }
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Divider between items */}
              {!isLast && <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.12)' }} />}
            </Box>
          );
        })}
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: 160
          }
        }}
      >
        {menuRow?.actions?.map((action: ActionDef) => (
          <MenuItem
            key={action.handler}
            onClick={() => handleMenuAction(action.handler)}
            sx={{
              color:
                action.type === 'button_delete'
                  ? '#EF4444'
                  : action.type === 'button_archive'
                    ? '#F59E0B'
                    : action.type === 'button_restore'
                      ? '#10B981'
                      : '#32343A',
              fontSize: '14px',
              py: 1.5,
              '&:hover': {
                bgcolor: '#F9FAFB'
              }
            }}
          >
            {action.label}
          </MenuItem>
        ))}

        {/* Frontend-defined extra actions */}
        {menuRow && extraRowActions.filter((ea) => !ea.show || ea.show(menuRow)).length > 0 && (
          <Divider sx={{ my: 0.5 }} />
        )}
        {menuRow &&
          extraRowActions
            .filter((ea) => !ea.show || ea.show(menuRow))
            .map((ea) => (
              <MenuItem
                key={ea.handler}
                onClick={() => handleMenuAction(ea.handler)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color:
                    ea.type === 'button_delete'
                      ? '#EF4444'
                      : ea.type === 'button_archive'
                        ? '#F59E0B'
                        : ea.type === 'button_restore'
                          ? '#10B981'
                          : '#32343A',
                  fontSize: '14px',
                  py: 1.5,
                  '&:hover': { bgcolor: '#F9FAFB' }
                }}
              >
                {ea.icon}
                {ea.label}
              </MenuItem>
            ))}
      </Menu>
    </>
  );
};

export default MobileCardListRenderer;
