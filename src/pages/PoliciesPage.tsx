import React, { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { GenericListView } from '@/components/lists';
import { fetchPoliciesTable, restorePolicy, type PolicyRecord } from '@/services/policiesService';
import { useUiStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import ArchivePolicyDialog from '@/components/dialogs/ArchivePolicyDialog';
import ForceDeletePolicyDialog from '@/components/dialogs/ForceDeletePolicyDialog';

const PoliciesPage: React.FC = () => {
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState<number | undefined>(undefined);

  // Permission checks
  const canViewList = hasPermission('policy view-list');
  const canCreatePolicy = hasPermission('policy create');

  // ——— Row handlers ———

  const handleViewPolicy = useCallback(() => {
    // TODO: navigate to policy details page when available
  }, []);

  const handleEditPolicy = useCallback(() => {
    // TODO: open edit policy dialog when available
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
    // TODO: open create policy dialog when available
    addToast({
      id: crypto.randomUUID(),
      message: 'Tworzenie polisy — wkrótce dostępne',
      severity: 'info'
    });
  }, [addToast]);

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
    </Box>
  );
};

export default PoliciesPage;
