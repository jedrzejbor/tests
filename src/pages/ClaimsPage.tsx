import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box } from '@mui/material';
import ClaimPasswordDialog from '@/components/dialogs/ClaimPasswordDialog';
import { GenericListView } from '@/components/lists';
import {
  fetchClaimsTable,
  forceDeleteClaim,
  restoreClaim,
  type ClaimRecord
} from '@/services/claimsService';
import type { ApiError } from '@/services/apiClient';
import { usePermission } from '@/hooks/usePermission';
import { useUiStore } from '@/store/uiStore';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import type { ExtraRowAction } from '@/types/genericList';

const ClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canViewList = hasPermission('claim view-list');
  const canEditClaim = hasPermission('claim edit');
  const canArchiveClaim = hasPermission('claim archive');
  const canRestoreClaim = hasPermission('claim restore');
  const canDeleteClaim = hasPermission('claim delete');

  const handleViewClaim = useCallback(
    (row: ClaimRecord) => {
      if (!row.id) return;
      navigate(`/app/damages/${row.id}`);
    },
    [navigate]
  );

  const handleEditClaim = useCallback(
    (row: ClaimRecord) => {
      if (!row.id) return;
      navigate(`/app/damages/${row.id}/edit`);
    },
    [navigate]
  );

  const handleArchiveClaim = useCallback((row: ClaimRecord) => {
    setSelectedClaim(row);
    setArchiveDialogOpen(true);
  }, []);

  const handleForceDeleteClaim = useCallback((row: ClaimRecord) => {
    setSelectedClaim(row);
    setForceDeleteDialogOpen(true);
  }, []);

  const handleRestoreClaim = useCallback(
    async (row: ClaimRecord) => {
      if (!row.id) return;

      try {
        await restoreClaim(row.id);
        addToast({
          id: crypto.randomUUID(),
          message: 'Szkoda została przywrócona',
          severity: 'success'
        });
        setRefreshKey((key) => key + 1);
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się przywrócić szkody',
          severity: 'error'
        });
      }
    },
    [addToast]
  );

  const handleCreateClaim = useCallback(() => {
    navigate('/app/damages/new');
  }, [navigate]);

  const handleClaimChanged = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handlers = useMemo(
    () => ({
      'view-claim': handleViewClaim,
      'edit-claim': handleEditClaim,
      'archive-claim': handleArchiveClaim,
      'delete-claim': handleForceDeleteClaim,
      'restore-claim': handleRestoreClaim,
      'create-claim': handleCreateClaim
    }),
    [
      handleViewClaim,
      handleEditClaim,
      handleArchiveClaim,
      handleForceDeleteClaim,
      handleRestoreClaim,
      handleCreateClaim
    ]
  );

  const hasBackendAction = (row: ClaimRecord, handler: string) =>
    row.actions?.some((action) => action.handler === handler) ?? false;

  const isArchived = (row: ClaimRecord) =>
    Boolean(row.deleted_at) || hasBackendAction(row, 'restore-claim');

  const extraRowActions: ExtraRowAction<ClaimRecord>[] = useMemo(
    () => [
      {
        handler: 'view-claim',
        label: 'Szczegóły',
        icon: <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />,
        show: (row) => !isArchived(row) && !hasBackendAction(row, 'view-claim')
      },
      {
        handler: 'edit-claim',
        label: 'Edytuj',
        icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
        show: (row) => canEditClaim && !isArchived(row) && !hasBackendAction(row, 'edit-claim')
      },
      {
        handler: 'archive-claim',
        label: 'Archiwizuj',
        icon: <ArchiveOutlinedIcon sx={{ fontSize: 18 }} />,
        type: 'button_archive',
        show: (row) =>
          canArchiveClaim && !isArchived(row) && !hasBackendAction(row, 'archive-claim')
      },
      {
        handler: 'restore-claim',
        label: 'Przywróć',
        icon: <RestoreOutlinedIcon sx={{ fontSize: 18 }} />,
        type: 'button_restore',
        show: (row) => canRestoreClaim && isArchived(row) && !hasBackendAction(row, 'restore-claim')
      },
      {
        handler: 'delete-claim',
        label: 'Usuń',
        icon: <DeleteOutlineIcon sx={{ fontSize: 18 }} />,
        type: 'button_delete',
        show: (row) => canDeleteClaim && isArchived(row) && !hasBackendAction(row, 'delete-claim')
      }
    ],
    [canEditClaim, canArchiveClaim, canRestoreClaim, canDeleteClaim]
  );

  if (!canViewList) {
    return (
      <Box component="main" pb={4}>
        <ListPlaceholderLayout title="Szkody">
          <NoAccessContent />
        </ListPlaceholderLayout>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GenericListView<ClaimRecord>
        title="Lista szkód"
        fetcher={fetchClaimsTable}
        handlers={handlers}
        rowKey={(row) => String(row.id || row.number)}
        initialPerPage={10}
        refreshKey={refreshKey}
        stateKey="/app/damages"
        mobileTitle="Szkody"
        mobilePrimaryActionLabel="Zgłoś"
        disabledGeneralActions={!hasPermission('claim create') ? ['create-claim'] : undefined}
        extraRowActions={extraRowActions}
        filterTypeOverrides={{
          claim_date: 'date_range',
          reported_date: 'date_range'
        }}
        filterLabelOverrides={{
          claim_date: 'Data szkody',
          reported_date: 'Data zgłoszenia',
          insurance_company_id: 'Zakład ubezpieczeń',
          policy_type_id: 'Typ polisy',
          client_id: 'Nazwa podmiotu'
        }}
        moveArchiveToBottom="archived"
      />

      <ClaimPasswordDialog
        open={archiveDialogOpen}
        onClose={() => {
          setArchiveDialogOpen(false);
          setSelectedClaim(null);
        }}
        claim={selectedClaim}
        mode="archive"
        onSuccess={handleClaimChanged}
      />

      <ClaimPasswordDialog
        open={forceDeleteDialogOpen}
        onClose={() => {
          setForceDeleteDialogOpen(false);
          setSelectedClaim(null);
        }}
        claim={selectedClaim}
        mode="delete"
        onSuccess={handleClaimChanged}
        action={forceDeleteClaim}
      />
    </Box>
  );
};

export default ClaimsPage;
