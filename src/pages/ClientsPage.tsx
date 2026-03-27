import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import { GenericListView } from '@/components/lists';
import { fetchClientsTable, restoreClient, type ClientRecord } from '@/services/clientsService';
import { useUiStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import AddClientDialog from '@/components/dialogs/AddClientDialog';
import EditClientDialog from '@/components/dialogs/EditClientDialog';
import ArchiveClientDialog from '@/components/dialogs/ArchiveClientDialog';
import ForceDeleteClientDialog from '@/components/dialogs/ForceDeleteClientDialog';

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState<number | undefined>(undefined);

  // Permission gate — user must have 'client view-list'
  const canViewList = hasPermission('client view-list');

  // ——— Row handlers ———

  const handleViewClient = useCallback(
    (row: ClientRecord) => {
      const clientId = row.id || row.name;
      navigate(`/app/clients/${clientId}`, { state: { client: row } });
    },
    [navigate]
  );

  const handleEditClient = useCallback((row: ClientRecord) => {
    setSelectedClient(row);
    setEditDialogOpen(true);
  }, []);

  const handleArchiveClient = useCallback((row: ClientRecord) => {
    setSelectedClient(row);
    setArchiveDialogOpen(true);
  }, []);

  const handleForceDeleteClient = useCallback((row: ClientRecord) => {
    setSelectedClient(row);
    setForceDeleteDialogOpen(true);
  }, []);

  const handleRestoreClient = useCallback(
    async (row: ClientRecord) => {
      if (!row.id) {
        addToast({
          id: crypto.randomUUID(),
          message: 'Brak identyfikatora klienta',
          severity: 'error'
        });
        return;
      }
      try {
        await restoreClient(row.id);
        addToast({
          id: crypto.randomUUID(),
          message: `Klient ${row.name} został przywrócony`,
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

  const handleCreateClient = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  // ——— Dialog callbacks ———

  const handleClientCreated = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: 'Klient został utworzony',
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [addToast]);

  const handleClientUpdated = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: 'Klient został zaktualizowany',
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [addToast]);

  const handleClientArchived = useCallback(() => {
    if (!selectedClient) return;
    addToast({
      id: crypto.randomUUID(),
      message: `Klient ${selectedClient.name} został zarchiwizowany`,
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [selectedClient, addToast]);

  const handleClientForceDeleted = useCallback(() => {
    if (!selectedClient) return;
    addToast({
      id: crypto.randomUUID(),
      message: `Klient ${selectedClient.name} został trwale usunięty`,
      severity: 'success'
    });
    setRefreshKey(Date.now());
  }, [selectedClient, addToast]);

  // ——— Bulk handlers ———

  const handleBulkNotify = useCallback(
    async (rows: ClientRecord[]) => {
      addToast({
        id: crypto.randomUUID(),
        message: `Wysłano powiadomienie do ${rows.length} klientów`,
        severity: 'success'
      });
    },
    [addToast]
  );

  // ——— Handler map ———

  const handlers = {
    // Row actions (from backend actions[])
    view: handleViewClient,
    'view-client': handleViewClient,
    edit: handleEditClient,
    'edit-client': handleEditClient,
    // Active clients — archive (soft delete)
    'archive-client': handleArchiveClient,
    // Archived clients — permanent delete
    'delete-client': handleForceDeleteClient,
    // Archived clients — restore
    'restore-client': handleRestoreClient,
    // Legacy handlers (backwards compat)
    delete: handleArchiveClient,
    'force-delete-client': handleForceDeleteClient,
    // General actions
    'create-client': handleCreateClient
  };

  const bulkHandlers = {
    'bulk-notify': handleBulkNotify
  };

  const bulkActions = [
    {
      label: 'Wyślij powiadomienie zbiorcze',
      handler: 'bulk-notify',
      variant: 'outlined' as const,
      icon: <CheckBoxOutlinedIcon />
    }
  ];

  if (!canViewList) {
    return (
      <Box component="main" pb={4}>
        <ListPlaceholderLayout title="Klienci">
          <NoAccessContent />
        </ListPlaceholderLayout>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GenericListView<ClientRecord>
        title="Lista Klientów"
        fetcher={fetchClientsTable}
        handlers={handlers}
        bulkActions={bulkActions}
        bulkHandlers={bulkHandlers}
        rowKey={(row) => String(row.id || row.name)}
        initialPerPage={10}
        refreshKey={refreshKey}
        stateKey="/app/clients"
      />

      <AddClientDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleClientCreated}
      />

      <EditClientDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={handleClientUpdated}
      />

      <ArchiveClientDialog
        open={archiveDialogOpen}
        onClose={() => {
          setArchiveDialogOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={handleClientArchived}
      />

      <ForceDeleteClientDialog
        open={forceDeleteDialogOpen}
        onClose={() => {
          setForceDeleteDialogOpen(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={handleClientForceDeleted}
      />
    </Box>
  );
};

export default ClientsPage;
