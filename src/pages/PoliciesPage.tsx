import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { GenericListView } from '@/components/lists';
import { fetchPoliciesTable, restorePolicy, type PolicyRecord } from '@/services/policiesService';
import { useUiStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import ArchivePolicyDialog from '@/components/dialogs/ArchivePolicyDialog';
import ForceDeletePolicyDialog from '@/components/dialogs/ForceDeletePolicyDialog';
import AddPolicyDialog from '@/components/dialogs/AddPolicyDialog';
import EditPolicyDialog from '@/components/dialogs/EditPolicyDialog';
import type { ExtraRowAction } from '@/types/genericList';

const PoliciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState<number | undefined>(undefined);

  // Permission checks
  const canViewList = hasPermission('policy view-list');
  const canCreatePolicy = hasPermission('policy create');
  const canEditPolicy = hasPermission('policy edit');
  const canArchivePolicy = hasPermission('policy archive');
  const canRestorePolicy = hasPermission('policy restore');
  const canDeletePolicy = hasPermission('policy delete');

  // ——— Row handlers ———

  const handleViewPolicy = useCallback(
    (row: PolicyRecord) => {
      if (!row.id) return;
      navigate(`/app/policies/${row.id}`, { state: { policy: row } });
    },
    [navigate]
  );

  const handleEditPolicy = useCallback((row: PolicyRecord) => {
    setSelectedPolicy(row);
    setEditDialogOpen(true);
  }, []);

  const handleArchivePolicy = useCallback((row: PolicyRecord) => {
    setSelectedPolicy(row);
    setArchiveDialogOpen(true);
  }, []);

  const handleForceDeletePolicy = useCallback((row: PolicyRecord) => {
    setSelectedPolicy(row);
    setForceDeleteDialogOpen(true);
  }, []);

  const handleRestorePolicy = useCallback(
    async (row: PolicyRecord) => {
      if (!row.id) {
        addToast({
          id: crypto.randomUUID(),
          message: 'Brak identyfikatora polisy',
          severity: 'error'
        });
        return;
      }
      try {
        await restorePolicy(row.id);
        addToast({
          id: crypto.randomUUID(),
          message: `Polisa ${row.number} została przywrócona`,
          severity: 'success'
        });
        setRefreshKey(Date.now());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Wystąpił błąd podczas przywracania';
        addToast({ id: crypto.randomUUID(), message, severity: 'error' });
      }
    },
    [addToast]
  );

  // ——— General handlers ———

  const handleCreatePolicy = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  // ——— Dialog callbacks ———

  const handlePolicyArchived = useCallback(() => {
    if (!selectedPolicy) return;
    addToast({
      id: crypto.randomUUID(),
      message: `Polisa ${selectedPolicy.number} została zarchiwizowana`,
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [selectedPolicy, addToast]);

  const handlePolicyForceDeleted = useCallback(() => {
    if (!selectedPolicy) return;
    addToast({
      id: crypto.randomUUID(),
      message: `Polisa ${selectedPolicy.number} została trwale usunięta`,
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [selectedPolicy, addToast]);

  const handlePolicyCreated = useCallback(() => {
    setRefreshKey(Date.now());
  }, []);

  const handlePolicyUpdated = useCallback(() => {
    setRefreshKey(Date.now());
  }, []);

  // ——— Handler map ———

  const handlers = {
    // Row actions (from backend actions[])
    view: handleViewPolicy,
    'view-policy': handleViewPolicy,
    edit: handleEditPolicy,
    'edit-policy': handleEditPolicy,
    // Active policies — archive (soft delete)
    'archive-policy': handleArchivePolicy,
    // Archived policies — permanent delete
    'delete-policy': handleForceDeletePolicy,
    // Archived policies — restore
    'restore-policy': handleRestorePolicy,
    // General actions
    'create-policy': handleCreatePolicy
  };

  /**
   * Helper: check if a given handler is already present in the row's backend actions.
   * If the backend already sends the action (permission resolved server-side),
   * we don't duplicate it in the extra actions.
   */
  const hasBackendAction = (row: PolicyRecord, handler: string) =>
    row.actions?.some((a) => a.handler === handler) ?? false;

  const isArchived = (row: PolicyRecord) => Boolean(row.deleted_at);

  // Extra row actions — shown based on frontend permissions,
  // but only when the backend didn't already include the same action.
  const extraRowActions: ExtraRowAction<PolicyRecord>[] = useMemo(
    () => [
      {
        handler: 'view-policy',
        label: 'Szczegóły',
        icon: <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />,
        show: (row) => !isArchived(row) && !hasBackendAction(row, 'view-policy')
      },
      {
        handler: 'edit-policy',
        label: 'Edytuj',
        icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
        show: (row) => canEditPolicy && !isArchived(row) && !hasBackendAction(row, 'edit-policy')
      },
      {
        handler: 'archive-policy',
        label: 'Archiwizuj',
        icon: <ArchiveOutlinedIcon sx={{ fontSize: 18 }} />,
        type: 'button_archive',
        show: (row) =>
          canArchivePolicy && !isArchived(row) && !hasBackendAction(row, 'archive-policy')
      },
      {
        handler: 'restore-policy',
        label: 'Przywróć',
        icon: <RestoreOutlinedIcon sx={{ fontSize: 18 }} />,
        type: 'button_restore',
        show: (row) =>
          canRestorePolicy && isArchived(row) && !hasBackendAction(row, 'restore-policy')
      },
      {
        handler: 'delete-policy',
        label: 'Usuń',
        icon: <DeleteOutlineIcon sx={{ fontSize: 18 }} />,
        type: 'button_delete',
        show: (row) => canDeletePolicy && isArchived(row) && !hasBackendAction(row, 'delete-policy')
      }
    ],
    [canEditPolicy, canArchivePolicy, canRestorePolicy, canDeletePolicy]
  );

  // ——— Permission gate ———

  if (!canViewList) {
    return (
      <Box component="main" pb={4}>
        <ListPlaceholderLayout title="Polisy">
          <NoAccessContent />
        </ListPlaceholderLayout>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GenericListView<PolicyRecord>
        title="Lista Polis"
        fetcher={fetchPoliciesTable}
        handlers={handlers}
        rowKey={(row) => String(row.id || row.number)}
        initialPerPage={10}
        refreshKey={refreshKey}
        stateKey="/app/policies"
        disabledGeneralActions={!canCreatePolicy ? ['create-policy'] : undefined}
        extraRowActions={extraRowActions}
      />

      <ArchivePolicyDialog
        open={archiveDialogOpen}
        onClose={() => {
          setArchiveDialogOpen(false);
          setSelectedPolicy(null);
        }}
        policy={selectedPolicy}
        onSuccess={handlePolicyArchived}
      />

      <ForceDeletePolicyDialog
        open={forceDeleteDialogOpen}
        onClose={() => {
          setForceDeleteDialogOpen(false);
          setSelectedPolicy(null);
        }}
        policy={selectedPolicy}
        onSuccess={handlePolicyForceDeleted}
      />

      <AddPolicyDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handlePolicyCreated}
      />

      <EditPolicyDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedPolicy(null);
        }}
        policy={selectedPolicy}
        onSuccess={handlePolicyUpdated}
      />
    </Box>
  );
};

export default PoliciesPage;
