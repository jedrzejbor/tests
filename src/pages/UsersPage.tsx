import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import { GenericListView } from '@/components/lists';
import { fetchUsersTable, restoreUser, UserRecord } from '@/services/usersService';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { impersonateUser } from '@/services/impersonationService';
import { usePermission } from '@/hooks/usePermission';
import AddUserDialog from '@/components/dialogs/AddUserDialog';
import EditUserDialog from '@/components/dialogs/EditUserDialog';
import DeleteUserDialog from '@/components/dialogs/DeleteUserDialog';
import ForceDeleteUserDialog from '@/components/dialogs/ForceDeleteUserDialog';
import type { AddUserFormValues, EditUserFormValues } from '@/utils/formSchemas';

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const setImpersonator = useAuthStore((s) => s.setImpersonator);
  const currentUser = useAuthStore((s) => s.user);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [forceDeleteDialogOpen, setForceDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState<number | undefined>(undefined);

  // Row handlers - actions for each row
  const handleViewUser = useCallback(
    (row: UserRecord) => {
      // Navigate to user details page, pass row data via state
      const userId = row.id || row.email; // Use ID if available, otherwise email as fallback
      navigate(`/app/users/${userId}`, { state: { user: row } });
    },
    [navigate]
  );

  const handleEditUser = useCallback((row: UserRecord) => {
    // Open edit dialog with user data
    setSelectedUser(row);
    setEditUserDialogOpen(true);
  }, []);

  const handleDeleteUser = useCallback((row: UserRecord) => {
    // Open delete confirmation dialog
    setSelectedUser(row);
    setDeleteUserDialogOpen(true);
  }, []);

  const handleForceDeleteUser = useCallback((row: UserRecord) => {
    setSelectedUser(row);
    setForceDeleteDialogOpen(true);
  }, []);

  const handleRestoreUser = useCallback(
    async (row: UserRecord) => {
      if (!row.id) {
        addToast({
          id: crypto.randomUUID(),
          message: 'Brak identyfikatora użytkownika',
          severity: 'error'
        });
        return;
      }

      try {
        await restoreUser(row.id);
        addToast({
          id: crypto.randomUUID(),
          message: `Użytkownik ${row.full_name} został przywrócony`,
          severity: 'success'
        });
        setRefreshKey(Date.now());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Wystąpił błąd podczas przywracania';
        addToast({
          id: crypto.randomUUID(),
          message,
          severity: 'error'
        });
      }
    },
    [addToast]
  );

  // General handlers - actions in toolbar
  const handleCreateUser = useCallback(() => {
    setAddUserDialogOpen(true);
  }, []);

  const handleImpersonateUser = useCallback(
    async (row: UserRecord) => {
      if (!row.id) return;
      try {
        const response = await impersonateUser(row.id);
        // Save original admin as impersonator before switching token
        if (currentUser) {
          setImpersonator(currentUser);
        }
        // Switch to impersonated user's token and data
        setToken(response.token);
        setUser({
          id: String(response.persona.user.id),
          name: `${response.persona.user.firstname} ${response.persona.user.lastname}`,
          email: response.persona.user.email ?? '',
          firstname: response.persona.user.firstname,
          lastname: response.persona.user.lastname,
          position: response.persona.user.position,
          phone: response.persona.user.phone,
          createdAt: response.persona.user.created_at,
          role: response.persona.user.role ?? null,
          permissions: response.persona.user.permissions ?? []
        });
        addToast({
          id: crypto.randomUUID(),
          message: `Impersonujesz: ${response.persona.user.firstname} ${response.persona.user.lastname}`,
          severity: 'success'
        });
        navigate('/app/dashboard');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Nie udało się rozpocząć impersonacji';
        addToast({ id: crypto.randomUUID(), message, severity: 'error' });
      }
    },
    [currentUser, setToken, setUser, setImpersonator, addToast, navigate]
  );

  // Handle dialog close
  const handleAddUserDialogClose = useCallback(() => {
    setAddUserDialogOpen(false);
  }, []);

  // Handle user created successfully
  const handleUserCreated = useCallback(
    (data: AddUserFormValues) => {
      addToast({
        id: crypto.randomUUID(),
        message: `Użytkownik ${data.email} został utworzony`,
        severity: 'success'
      });
      setRefreshKey(Date.now());
    },
    [addToast]
  );

  // Handle dialog close
  const handleEditUserDialogClose = useCallback(() => {
    setEditUserDialogOpen(false);
    setSelectedUser(null);
  }, []);

  // Handle user updated successfully
  const handleUserUpdated = useCallback(
    (data: EditUserFormValues) => {
      addToast({
        id: crypto.randomUUID(),
        message: `Użytkownik ${data.email} został zaktualizowany`,
        severity: 'success'
      });
      setRefreshKey(Date.now());
    },
    [addToast]
  );

  // Handle delete dialog close
  const handleDeleteUserDialogClose = useCallback(() => {
    setDeleteUserDialogOpen(false);
    setSelectedUser(null);
  }, []);

  const handleForceDeleteDialogClose = useCallback(() => {
    setForceDeleteDialogOpen(false);
    setSelectedUser(null);
  }, []);

  // Handle user deleted successfully
  const handleUserDeleted = useCallback(async () => {
    if (!selectedUser) return;

    try {
      addToast({
        id: crypto.randomUUID(),
        message: `Użytkownik ${selectedUser.full_name} został usunięty`,
        severity: 'success'
      });
      setRefreshKey(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania';
      addToast({
        id: crypto.randomUUID(),
        message,
        severity: 'error'
      });
    }
  }, [selectedUser, addToast]);

  const handleUserForceDeleted = useCallback(async () => {
    if (!selectedUser) return;

    try {
      addToast({
        id: crypto.randomUUID(),
        message: `Użytkownik ${selectedUser.full_name} został trwale usunięty`,
        severity: 'success'
      });
      setRefreshKey(Date.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Wystąpił błąd podczas trwałego usuwania';
      addToast({
        id: crypto.randomUUID(),
        message,
        severity: 'error'
      });
    }
  }, [selectedUser, addToast]);

  // Bulk handlers - actions for selected rows
  const handleBulkNotify = useCallback(
    async (rows: UserRecord[]) => {
      // Send notification to selected users
      addToast({
        id: crypto.randomUUID(),
        message: `Wysłano powiadomienie do ${rows.length} użytkowników`,
        severity: 'success'
      });
    },
    [addToast]
  );

  // Combined handlers map
  const handlers = {
    // Row actions (from backend actions[])
    view: handleViewUser,
    'view-user': handleViewUser,
    edit: handleEditUser,
    'edit-user': handleEditUser,
    // Active users — archive (soft delete)
    'archive-user': handleDeleteUser,
    // Archived users — permanent delete
    'delete-user': handleForceDeleteUser,
    // Archived users — restore
    'restore-user': handleRestoreUser,
    // Legacy handlers (backwards compat)
    delete: handleDeleteUser,
    'force-delete-user': handleForceDeleteUser,
    // Impersonation
    'impersonate-user': handleImpersonateUser,
    // General actions (from backend generalActions[])
    'create-user': handleCreateUser
  };

  // Frontend-defined extra row actions (not returned by backend)
  const extraRowActions = [
    {
      handler: 'impersonate-user',
      label: 'Zaloguj jako użytkownik',
      icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 18 }} />,
      // Only show for non-deleted users when current user has impersonation permission
      show: (row: UserRecord) => !row.deleted_at && hasPermission('user can-impersonate')
    }
  ];

  // Bulk handlers map
  const bulkHandlers = {
    'bulk-notify': handleBulkNotify
  };

  // Bulk actions definition
  const bulkActions = [
    {
      label: 'Wyślij powiadomienie zbiorcze',
      handler: 'bulk-notify',
      variant: 'outlined' as const,
      icon: <CheckBoxOutlinedIcon />
    }
  ];

  return (
    <Box>
      <GenericListView<UserRecord>
        title="Lista Użytkowników"
        fetcher={fetchUsersTable}
        handlers={handlers}
        bulkActions={bulkActions}
        bulkHandlers={bulkHandlers}
        rowKey={(row) => String(row.id || row.email)}
        initialPerPage={10}
        refreshKey={refreshKey}
        extraRowActions={extraRowActions}
        stateKey="/app/users"
      />

      <AddUserDialog
        open={addUserDialogOpen}
        onClose={handleAddUserDialogClose}
        onSuccess={handleUserCreated}
      />

      <EditUserDialog
        open={editUserDialogOpen}
        onClose={handleEditUserDialogClose}
        user={selectedUser}
        onSuccess={handleUserUpdated}
      />

      <DeleteUserDialog
        open={deleteUserDialogOpen}
        onClose={handleDeleteUserDialogClose}
        user={selectedUser}
        onSuccess={handleUserDeleted}
      />

      <ForceDeleteUserDialog
        open={forceDeleteDialogOpen}
        onClose={handleForceDeleteDialogClose}
        user={selectedUser}
        onSuccess={handleUserForceDeleted}
      />
    </Box>
  );
};

export default UsersPage;
