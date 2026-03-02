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
  Divider
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ColumnDef, GenericRecord, ActionDef, ExtraRowAction } from '@/types/genericList';

interface MobileCardListRendererProps<T extends GenericRecord = GenericRecord> {
  columns: ColumnDef[];
  data: T[];
  loading: boolean;
  onRowAction: (handler: string, row: T) => void;
  getRowId: (row: T) => string;
  /** Frontend-defined actions appended after backend actions in the kebab menu */
  extraRowActions?: ExtraRowAction<T>[];
}

// Get status chip styles
const getStatusChipStyles = (status: string) => {
  const lowerStatus = status?.toLowerCase() || '';
  if (lowerStatus.includes('aktywny') || lowerStatus.includes('active')) {
    return {
      bgcolor: '#ECFDF3',
      color: '#027A48',
      dotColor: '#12B76A'
    };
  }
  if (
    lowerStatus.includes('nieaktywny') ||
    lowerStatus.includes('inactive') ||
    lowerStatus.includes('nieaktywny')
  ) {
    return {
      bgcolor: '#FEF3F2',
      color: '#B42318',
      dotColor: '#F04438'
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

export const MobileCardListRenderer = <T extends GenericRecord = GenericRecord>({
  columns,
  data,
  loading,
  onRowAction,
  getRowId,
  extraRowActions = []
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

  // Find title column (full_name or first text column)
  const titleColumn =
    columns.find((c) => c.type === 'full_name') || columns.find((c) => c.type === 'text');

  // Find subtitle column (company or second column)
  const subtitleColumn = columns.find((c) => c.property === 'company' || c.property === 'position');

  // Find email column
  const emailColumn = columns.find((c) => c.property === 'email');

  // Find phone column
  const phoneColumn = columns.find((c) => c.property === 'phone');

  // Find status column
  const statusColumn = columns.find((c) => c.type === 'status' || c.property === 'status');

  // Find account_type column
  const accountTypeColumn = columns.find((c) => c.property === 'account_type');

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
          const isLast = index === data.length - 1;

          // Get values
          const titleValue = titleColumn?.property ? String(row[titleColumn.property] || '') : '';
          const subtitleValue = subtitleColumn?.property
            ? String(row[subtitleColumn.property] || '')
            : '';
          const emailValue = emailColumn?.property ? String(row[emailColumn.property] || '') : '';
          const phoneValue = phoneColumn?.property ? String(row[phoneColumn.property] || '') : '';
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

                  {rowActions.length > 0 && (
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

                {/* Email */}
                {emailValue && (
                  <Typography
                    sx={{
                      color: '#74767F',
                      fontSize: '14px',
                      lineHeight: '20px',
                      fontWeight: 400,
                      mt: 0.5
                    }}
                  >
                    {emailColumn?.label || 'Email'}: {emailValue}
                  </Typography>
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
              color: action.type === 'button_delete' ? '#EF4444' : '#32343A',
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
                  color: '#32343A',
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
