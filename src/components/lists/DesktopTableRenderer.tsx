import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Link,
  Skeleton,
  Box,
  Typography,
  Divider,
  Tooltip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ColumnDef, GenericRecord, ActionDef, ExtraRowAction } from '@/types/genericList';

/**
 * Extract tooltip items from row meta for a given column property.
 * Backend sends content as either [] (empty array) or { "1": "...", "2": "..." } (object).
 * This helper normalises both formats into a string[].
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

interface DesktopTableRendererProps<T extends GenericRecord = GenericRecord> {
  columns: ColumnDef[];
  data: T[];
  loading: boolean;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleRowSelection: (row: T) => void;
  onToggleAllSelection: () => void;
  onRowAction: (handler: string, row: T) => void;
  getRowId: (row: T) => string;
  /** Frontend-defined actions appended after backend actions in the kebab menu */
  extraRowActions?: ExtraRowAction<T>[];
}

// Map action types to icons
const getActionIcon = (type: string) => {
  switch (type) {
    case 'button_primary':
      return <VisibilityOutlinedIcon fontSize="small" />;
    case 'button_secondary':
      return <EditOutlinedIcon fontSize="small" />;
    case 'button_delete':
      return <DeleteOutlineIcon fontSize="small" />;
    case 'button_archive':
      return <ArchiveOutlinedIcon fontSize="small" />;
    case 'button_restore':
      return <RestoreOutlinedIcon fontSize="small" />;
    case 'button_download':
      return <DownloadOutlinedIcon fontSize="small" />;
    default:
      return null;
  }
};

// Get status chip color
const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  const lowerStatus = status?.toLowerCase() || '';
  if (lowerStatus.includes('aktywny') || lowerStatus.includes('active')) return 'success';
  if (
    lowerStatus.includes('nieaktywny') ||
    lowerStatus.includes('inactive') ||
    lowerStatus.includes('nieaktywny')
  )
    return 'error';
  if (lowerStatus.includes('pending') || lowerStatus.includes('oczekuje')) return 'warning';
  return 'default';
};

// Render cell based on column type
const renderCell = <T extends GenericRecord>(column: ColumnDef, row: T) => {
  if (!column.property) return null;

  const value = row[column.property];
  const stringValue = value !== null && value !== undefined ? String(value) : '—';

  // ===== CLIENT TABLE CUSTOM RENDERING =====
  // Nazwa Klienta, Podmioty zarządzające, NIP, Miasto → jak email (Link)
  if (
    column.property === 'name' ||
    column.property === 'parent_client' ||
    column.property === 'nip' ||
    column.property === 'city'
  ) {
    return (
      <Link
        sx={{
          color: 'text.primary',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 400,
          cursor: 'default',
          '&:hover': { textDecoration: 'underline' }
        }}
      >
        {stringValue.length > 35 ? `${stringValue.slice(0, 32)}...` : stringValue}
      </Link>
    );
  }

  // Podmioty zależne (child_client) → value + info icon with tooltip listing all child clients
  if (column.property === 'child_client') {
    const tooltipItems = getTooltipItems(row, column.property);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Link
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 400,
            cursor: 'default',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {stringValue.length > 30 ? `${stringValue.slice(0, 27)}...` : stringValue}
        </Link>
        {tooltipItems.length > 0 && (
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
            placement="top"
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
        )}
      </Box>
    );
  }

  // Rodzaj klienta (type) → jak rodzaj konta (Chip with badge style)
  if (column.property === 'type' && row.type) {
    return (
      <Chip
        label={stringValue}
        size="small"
        variant="filled"
        sx={{
          borderRadius: '20px',
          fontWeight: 400,
          fontSize: '12px',
          textTransform: 'capitalize',
          color: '#111827',
          height: 28,
          bgcolor: '#F3F4F6',
          px: '0',
          lineHeight: '18px'
        }}
      />
    );
  }

  // Zakres umocowania (authority_scope) → jak rodzaj konta (Chip)
  if (column.property === 'authority_scope') {
    return (
      <Chip
        label={stringValue}
        size="small"
        variant="filled"
        sx={{
          borderRadius: '20px',
          fontWeight: 400,
          fontSize: '12px',
          textTransform: 'capitalize',
          color: '#111827',
          height: 28,
          bgcolor: '#F3F4F6',
          px: '0',
          lineHeight: '18px'
        }}
      />
    );
  }

  // // Status (status) → jak status z użytkowników (dot + text)
  // if (column.property === 'status' && row.status) {
  //   const statusColorMap: Record<string, string> = {
  //     success: '#10B981',
  //     error: '#EF4444',
  //     warning: '#F59E0B',
  //     default: '#6B7280'
  //   };
  //   const statusColor = getStatusColor(stringValue);
  //   const dotColor = statusColorMap[statusColor] || statusColorMap.default;

  //   return (
  //     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  //       <Box
  //         sx={{
  //           width: 6,
  //           height: 6,
  //           borderRadius: '50%',
  //           bgcolor: dotColor
  //         }}
  //       />
  //       <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
  //         {stringValue}
  //       </Typography>
  //     </Box>
  //   );
  // }

  // Special handling for company/firma column with icon
  if (column.property === 'company' || column.property === 'firma') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            bgcolor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 500,
            color: '#6B7280'
          }}
        >
          {stringValue.substring(0, 2).toUpperCase()}
        </Box>
        <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
          {stringValue}
        </Typography>
      </Box>
    );
  }

  switch (column.type) {
    case 'email':
      return (
        <Link
          href={`mailto:${stringValue}`}
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 400,
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {stringValue.length > 25 ? `${stringValue.slice(0, 22)}...` : stringValue}
        </Link>
      );

    case 'phone':
      return (
        <Link
          href={`tel:${stringValue.replace(/\s/g, '')}`}
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 400,
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {stringValue}
        </Link>
      );

    case 'full_name':
      return (
        <Typography sx={{ fontWeight: 400, fontSize: '14px', color: '#32343A' }}>
          {stringValue}
        </Typography>
      );

    case 'datetime': {
      // Format datetime: "2026-03-04 00:00:00" → "04.03.2026"
      if (!value) return <Typography sx={{ fontSize: '14px', color: '#32343A' }}>—</Typography>;
      try {
        const d = new Date(stringValue);
        const formatted = d.toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        return (
          <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
            {formatted}
          </Typography>
        );
      } catch {
        return (
          <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
            {stringValue}
          </Typography>
        );
      }
    }

    case 'array': {
      // Render array of objects — e.g. attachments: [{id, name, size}]
      if (!Array.isArray(value) || value.length === 0)
        return <Typography sx={{ fontSize: '14px', color: '#9CA3AF' }}>—</Typography>;

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {(value as Record<string, unknown>[]).map((item, i) => {
            const label =
              typeof item === 'string'
                ? item
                : (item.name as string) || (item.label as string) || String(item);
            return (
              <Typography
                key={i}
                sx={{
                  fontSize: '14px',
                  color: '#32343A',
                  fontWeight: 400,
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </Typography>
            );
          })}
        </Box>
      );
    }

    case 'status':
    case 'badge': {
      const statusColorMap: Record<string, string> = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        default: '#6B7280'
      };
      const statusColor = getStatusColor(stringValue);
      const dotColor = statusColorMap[statusColor] || statusColorMap.default;

      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: dotColor
            }}
          />
          <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
            {stringValue}
          </Typography>
        </Box>
      );
    }

    case 'text':
    default:
      // Check if this looks like a status/account_type field for chip rendering
      if (
        column.property === 'account_type' ||
        column.property === 'role' ||
        column.property?.includes('type')
      ) {
        return (
          <Chip
            label={stringValue}
            size="small"
            variant="filled"
            sx={{
              borderRadius: '20px',
              fontWeight: 400,
              fontSize: '12px',
              textTransform: 'capitalize',
              color: '#111827',
              height: 28,
              bgcolor: '#F3F4F6',
              px: '0',
              lineHeight: '18px'
            }}
          />
        );
      }
      return (
        <Typography sx={{ fontSize: '14px', color: '#32343A', fontWeight: 400 }}>
          {stringValue.length > 50 ? `${stringValue.slice(0, 47)}...` : stringValue}
        </Typography>
      );
  }
};

export const DesktopTableRenderer = <T extends GenericRecord = GenericRecord>({
  columns,
  data,
  loading,
  selectedIds,
  allSelected,
  someSelected,
  onToggleRowSelection,
  onToggleAllSelection,
  onRowAction,
  getRowId,
  extraRowActions = []
}: DesktopTableRendererProps<T>) => {
  const showSelection = false;

  // Row action menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<T | null>(null);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuRow(row);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchorEl(null);
    setMenuRow(null);
  }, []);

  const handleActionClick = useCallback(
    (handler: string) => {
      if (menuRow) {
        onRowAction(handler, menuRow);
      }
      handleMenuClose();
    },
    [menuRow, onRowAction, handleMenuClose]
  );

  // Loading skeleton
  if (loading) {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {showSelection && (
                <TableCell padding="checkbox">
                  <Checkbox disabled />
                </TableCell>
              )}
              {columns
                .filter((c) => c.type !== 'actions')
                .map((col, index) => (
                  <TableCell key={index}>
                    <Skeleton width={100} />
                  </TableCell>
                ))}
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {showSelection && (
                  <TableCell padding="checkbox">
                    <Checkbox disabled />
                  </TableCell>
                )}
                {columns
                  .filter((c) => c.type !== 'actions')
                  .map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton />
                    </TableCell>
                  ))}
                <TableCell align="right">
                  <Skeleton width={24} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Brak danych do wyświetlenia
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Spróbuj zmienić filtry lub dodaj nowe rekordy
        </Typography>
      </Box>
    );
  }

  const safeColumns = Array.isArray(columns) ? columns : [];
  const visibleColumns = safeColumns.filter((c) => c.type !== 'actions');
  const hasActions = safeColumns.some((c) => c.type === 'actions');

  return (
    <>
      <TableContainer
        sx={{
          bgcolor: 'transparent',
          flex: 1,
          overflow: 'auto'
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: '#FFFFFF',
                height: 48,
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
              }}
            >
              {showSelection && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    width: 48,
                    pl: 2.5,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: '#FFFFFF'
                  }}
                >
                  <Checkbox
                    checked={allSelected ?? false}
                    indeterminate={someSelected ?? false}
                    onChange={onToggleAllSelection}
                    sx={{
                      color: '#D0D5DD',
                      '&.Mui-checked': {
                        color: '#1E1F21'
                      },
                      '&.MuiCheckbox-indeterminate': {
                        color: '#1E1F21'
                      }
                    }}
                  />
                </TableCell>
              )}
              {visibleColumns.map((column, index) => (
                <TableCell
                  key={column.property || index}
                  sx={{
                    fontWeight: 500,
                    fontSize: '12px',
                    fontFamily: 'Inter, Roboto, system-ui, -apple-system, "Segoe UI", sans-serif',
                    lineHeight: '18px',
                    color: '#74767F',
                    py: 1.5,
                    px: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    height: 48,
                    bgcolor: '#FFFFFF'
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell
                  align="right"
                  sx={{
                    width: 60,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: '#FFFFFF'
                  }}
                />
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => {
              const rowId = getRowId(row);
              const isSelected = showSelection && selectedIds ? selectedIds.has(rowId) : false;

              return (
                <TableRow
                  key={rowId}
                  hover
                  selected={isSelected}
                  sx={{
                    height: 72,
                    bgcolor: index % 2 === 0 ? '#FBF9F9' : 'transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(143, 109, 95, 0.04)'
                    },
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.02)'
                    },
                    '& td': {
                      borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                    },
                    cursor: 'pointer'
                  }}
                >
                  {showSelection && (
                    <TableCell padding="checkbox" sx={{ pl: 2.5 }}>
                      <Checkbox
                        checked={isSelected ?? false}
                        onChange={() => onToggleRowSelection(row)}
                        sx={{
                          color: '#D0D5DD',
                          '&.Mui-checked': {
                            color: '#1E1F21'
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((column, index) => (
                    <TableCell
                      key={column.property || index}
                      sx={{
                        py: 2.5,
                        px: 2,
                        fontSize: '14px',
                        color: '#32343A'
                      }}
                    >
                      {renderCell(column, row)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, row)}
                        sx={{ color: '#8E9098' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row actions menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: 'white',
            border: '1px solid #D0D5DD',
            borderRadius: '4px',
            boxShadow: '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
            minWidth: 110,
            mt: 0.5,
            overflow: 'visible',
            '& .MuiList-root': {
              p: '12px 16px',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        {menuRow?.actions?.map((action: ActionDef, index: number) => (
          <React.Fragment key={action.handler}>
            <MenuItem
              onClick={() => handleActionClick(action.handler)}
              sx={{
                color:
                  action.type === 'button_delete'
                    ? '#EF4444'
                    : action.type === 'button_archive'
                      ? '#F59E0B'
                      : action.type === 'button_restore'
                        ? '#10B981'
                        : '#1E1F21',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '24px',
                letterSpacing: '0.4px',
                py: 1,
                px: 0,
                gap: 1,
                minHeight: 'auto',
                '&:hover': {
                  bgcolor: 'transparent'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    action.type === 'button_delete'
                      ? '#EF4444'
                      : action.type === 'button_archive'
                        ? '#F59E0B'
                        : action.type === 'button_restore'
                          ? '#10B981'
                          : '#8E9098',
                  minWidth: 'auto',
                  width: 16,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& svg': {
                    fontSize: 20
                  }
                }}
              >
                {getActionIcon(action.type)}
              </ListItemIcon>
              <ListItemText
                primary={action.label}
                primaryTypographyProps={{
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '24px',
                  letterSpacing: '0.4px',
                  color: '#1E1F21'
                }}
                sx={{ m: 0 }}
              />
            </MenuItem>
            {index < (menuRow.actions?.length || 0) - 1 && (
              <Divider
                sx={{
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  my: '0 !important',
                  mx: 0
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Frontend-defined extra actions */}
        {menuRow &&
          extraRowActions
            .filter((ea) => !ea.show || ea.show(menuRow))
            .map((ea, index) => (
              <React.Fragment key={ea.handler}>
                {/* Divider before first extra action when backend actions exist */}
                {index === 0 && (menuRow.actions?.length ?? 0) > 0 && (
                  <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.12)', my: '0 !important', mx: 0 }} />
                )}
                <MenuItem
                  onClick={() => handleActionClick(ea.handler)}
                  sx={{
                    color: '#1E1F21',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    letterSpacing: '0.4px',
                    py: 1,
                    px: 0,
                    gap: 1,
                    minHeight: 'auto',
                    '&:hover': { bgcolor: 'transparent' }
                  }}
                >
                  {ea.icon && (
                    <ListItemIcon
                      sx={{
                        color: '#8E9098',
                        minWidth: 'auto',
                        width: 16,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& svg': { fontSize: 20 }
                      }}
                    >
                      {ea.icon}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={ea.label}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '24px',
                      letterSpacing: '0.4px',
                      color: '#1E1F21'
                    }}
                    sx={{ m: 0 }}
                  />
                </MenuItem>
                {index <
                  extraRowActions.filter((e) => !e.show || (menuRow && e.show(menuRow))).length -
                    1 && (
                  <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.12)', my: '0 !important', mx: 0 }} />
                )}
              </React.Fragment>
            ))}
      </Menu>
    </>
  );
};

export default DesktopTableRenderer;
