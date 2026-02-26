import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import PageTitle from '@/components/PageTitle';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import FormModal from '@/components/modals/FormModal';
import EditAccountDataForm from '@/components/forms/EditAccountDataForm';
import ChangePasswordForm from '@/components/forms/ChangePasswordForm';
import type { EditAccountDataFormValues, ChangePasswordFormValues } from '@/utils/formSchemas';
import { getMe, updateMe } from '@/services/authService';

const SettingsPage = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const token = useAuthStore((state) => state.token);
  const { addToast } = useUiStore();
  const hasFetchedMe = useRef(false);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || hasFetchedMe.current) return;
    hasFetchedMe.current = true;

    const loadMe = async () => {
      try {
        const fetchedUser = await getMe();
        const firstname = fetchedUser.firstname ?? user?.firstname;
        const lastname = fetchedUser.lastname ?? user?.lastname;
        const mergedUser = {
          ...(user ?? {}),
          ...fetchedUser,
          email: fetchedUser.email || user?.email,
          name: `${firstname ?? ''} ${lastname ?? ''}`.trim()
        };
        setUser(mergedUser);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Nie udało się pobrać danych konta';
        addToast({ id: crypto.randomUUID(), message, severity: 'error' });
      }
    };

    loadMe();
  }, [token, user, setUser, addToast]);

  // Mock user data for display (replace with real data from your auth store or API)
  const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    // Convert "YYYY-MM-DD hh:mm:ss" to ISO by replacing space with 'T'
    const isoString = iso.includes('T') ? iso : iso.replace(' ', 'T');
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };
  const userData: {
    firstName: string;
    lastName: string;
    position: string;
    status: string;
    phone: string;
    email: string;
    lastPasswordChange: string;
  } = {
    firstName: user?.firstname || user?.name?.split(' ')[0] || 'Joanna',
    lastName: user?.lastname || user?.name?.split(' ')[1] || 'Kowalska',
    position: user?.position || 'Super Admin Cliffside Brokers',
    status: 'Aktywny',
    phone: String(user?.phone ?? '+48 123 123 123'),
    email: user?.email || 'joannakowalska@cliffsidebrokers.com',
    lastPasswordChange: formatDate(
      String(user?.passwordLastChange ?? user?.password_last_change_at ?? '')
    )
  };

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleChangePassword = () => {
    setPasswordModalOpen(true);
  };

  const handleEditSubmit = async (data: EditAccountDataFormValues) => {
    setLoading(true);
    try {
      // Call API to update account data
      const resp = await updateMe({
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        phone: data.phone
      });

      // Backend may return the updated user object or partial fields.
      const returned = resp?.user ?? {};

      // Merge returned fields into auth store user
      const newFirstname = returned.firstname ?? data.firstName ?? user?.firstname;
      const newLastname = returned.lastname ?? data.lastName ?? user?.lastname;
      const newEmail = returned.email ?? data.email ?? user?.email;
      const newPosition = returned.position ?? user?.position;
      const newPhone = returned.phone ?? data.phone ?? user?.phone;

      const updatedUser = {
        ...(user ?? {}),
        id: user?.id ?? (returned.id ? String(returned.id) : ''),
        firstname: newFirstname,
        lastname: newLastname,
        email: newEmail,
        position: newPosition,
        phone: newPhone,
        name: `${newFirstname ?? ''} ${newLastname ?? ''}`.trim()
      };

      setUser(updatedUser);

      addToast({
        id: crypto.randomUUID(),
        message: 'Dane konta zostały zaktualizowane',
        severity: 'success'
      });
      setEditModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd podczas aktualizacji danych';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: ChangePasswordFormValues) => {
    setLoading(true);
    try {
      // Call API to change password
      const resp = await updateMe({
        current_password: data.currentPassword,
        password: data.newPassword,
        password_confirmation: data.confirmNewPassword
      });

      // If email or other fields are returned, merge them as well
      const returned = resp?.user ?? {};
      if (returned && Object.keys(returned).length > 0) {
        const updatedUser = {
          ...(user ?? {}),
          id: user?.id ?? (returned.id ? String(returned.id) : ''),
          firstname: returned.firstname ?? user?.firstname,
          lastname: returned.lastname ?? user?.lastname,
          email: returned.email ?? user?.email,
          position: returned.position ?? user?.position,
          name: `${returned.firstname ?? user?.firstname ?? ''} ${returned.lastname ?? user?.lastname ?? ''}`.trim()
        };
        setUser(updatedUser);
      }

      addToast({
        id: crypto.randomUUID(),
        message: 'Hasło zostało zmienione',
        severity: 'success'
      });
      setPasswordModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd podczas zmiany hasła';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Reusable field component for desktop grid
  const FieldItem = ({
    label,
    value,
    children
  }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
  }) => (
    <Box sx={{ flex: 1, p: 1.5 }}>
      <Typography
        variant="body2"
        sx={{ color: '#74767F', mb: 0.5, fontSize: '14px', lineHeight: 1.43 }}
      >
        {label}
      </Typography>
      {children || (
        <Typography
          variant="body2"
          sx={{ color: '#32343A', fontWeight: 500, fontSize: '14px', lineHeight: 1.57 }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );

  return (
    <Stack
      spacing={3}
      sx={{
        maxWidth: isMdUp ? '100%' : 800,
        mx: 'auto',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2,
        py: 3,
        px: isMdUp ? 3 : 1,
        height: '100%'
      }}
    >
      {/* Page Title */}
      <PageTitle sx={{ mb: 0 }}>Szczegóły konta</PageTitle>

      {/* Account Data Section */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header with title and button (button only on desktop) */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'rgba(143, 109, 95, 0.3)',
              pb: 1,
              px: 1.5,
              mb: 1,
              ...(!isMdUp && {
                backgroundColor: '#F5F5F5',
                borderRadius: 1,
                border: 'none',
                px: 2,
                pt: 1
              })
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: '#1E1F21',
                fontSize: '16px',
                lineHeight: 1.75
              }}
            >
              Dane konta:
            </Typography>
            {isMdUp && (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={handleEdit}
                sx={{
                  bgcolor: '#1E1F21',
                  color: '#FFFFFF',
                  borderRadius: 1,
                  px: 2,
                  '&:hover': { bgcolor: '#32343A' }
                }}
              >
                Edytuj
              </Button>
            )}
          </Stack>

          {/* Desktop: Grid layout, Mobile: Stack layout */}
          {isMdUp ? (
            // Desktop layout - horizontal grid
            <Box sx={{ px: 1.5 }}>
              {/* First row: Imię, Nazwisko, Stanowisko, Status */}
              <Stack direction="row" sx={{ mb: 1 }}>
                <FieldItem label="Imię" value={userData.firstName} />
                <FieldItem label="Nazwisko" value={userData.lastName} />
                <FieldItem label="Stanowisko" value={userData.position} />
                <FieldItem label="Status">
                  <Chip
                    label={userData.status}
                    size="small"
                    sx={{
                      bgcolor: '#E8F5E9',
                      color: '#2E7D32',
                      fontWeight: 400,
                      fontSize: '12px',
                      height: '20px',
                      padding: '3px 8px',
                      '& .MuiChip-icon': { mr: '6px', ml: 0 },
                      '& .MuiChip-label': { px: 0 }
                    }}
                    icon={
                      <Box
                        component="span"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: '#4CAF50',
                          ml: 1
                        }}
                      />
                    }
                  />
                </FieldItem>
              </Stack>
              {/* Second row: Telefon, E-mail */}
              <Stack direction="row">
                <FieldItem label="Telefon" value={userData.phone} />
                <FieldItem label="E-mail" value={userData.email} />
                <Box sx={{ flex: 1, p: 1.5 }} />
                <Box sx={{ flex: 1, p: 1.5 }} />
              </Stack>
            </Box>
          ) : (
            // Mobile layout - vertical stack
            <Stack spacing={2.5} sx={{ px: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Imię
                </Typography>
                <Typography variant="body3">{userData.firstName}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Nazwisko
                </Typography>
                <Typography variant="body3">{userData.lastName}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Stanowisko
                </Typography>
                <Typography variant="body3">{userData.position}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Status
                </Typography>
                <Chip
                  label={userData.status}
                  size="small"
                  sx={{
                    bgcolor: '#E8F5E9',
                    color: '#2E7D32',
                    fontWeight: 400,
                    fontSize: '12px',
                    padding: '3px 8px',
                    '& .MuiChip-icon': { mr: '6px', ml: 0 },
                    '& .MuiChip-label': { px: 0 }
                  }}
                  icon={
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#4CAF50'
                      }}
                    />
                  }
                />
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Telefon
                </Typography>
                <Typography variant="body3">{userData.phone}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  E-mail
                </Typography>
                <Typography variant="body3">{userData.email}</Typography>
              </Stack>
              {/* Mobile: Edit button at bottom */}
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={handleEdit}
                  sx={{ borderRadius: 1 }}
                >
                  Edytuj
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Password Settings Section */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header with title and button (button only on desktop) */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'rgba(143, 109, 95, 0.3)',
              pb: 1,
              px: 1.5,
              mb: 1,
              ...(!isMdUp && {
                backgroundColor: '#F5F5F5',
                borderRadius: 1,
                border: 'none',
                px: 2,
                pt: 1
              })
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: '#1E1F21',
                fontSize: '16px',
                lineHeight: 1.75
              }}
            >
              Ustawienia hasła :
            </Typography>
            {isMdUp && (
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={handleChangePassword}
                sx={{
                  bgcolor: '#1E1F21',
                  color: '#FFFFFF',
                  borderRadius: 1,
                  px: 2,
                  '&:hover': { bgcolor: '#32343A' }
                }}
              >
                Zmiana hasła
              </Button>
            )}
          </Stack>

          {/* Desktop: horizontal layout, Mobile: vertical */}
          {isMdUp ? (
            <Stack direction="row" sx={{ px: 1.5, py: 1 }}>
              <Box sx={{ width: 305 }}>
                <Typography
                  variant="body2"
                  sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43 }}
                >
                  Hasło
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#32343A', fontWeight: 500, fontSize: '14px', letterSpacing: 2 }}
                >
                  ***********
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43 }}
                >
                  Ostatnia zmiana hasła
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#32343A', fontWeight: 500, fontSize: '14px' }}
                >
                  {userData.lastPasswordChange}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ px: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Hasło
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, letterSpacing: 2 }}>
                  ***********
                </Typography>
              </Stack>
              {/* Mobile: Change password button at bottom */}
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={handleChangePassword}
                  sx={{ borderRadius: 1 }}
                >
                  Zmiana hasła
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications Section */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header */}
          <Box
            sx={{
              borderBottom: '1px solid',
              borderColor: 'rgba(143, 109, 95, 0.3)',
              pb: 1,
              px: 1.5,
              mb: 1,
              ...(!isMdUp && {
                backgroundColor: '#F5F5F5',
                borderRadius: 1,
                border: 'none',
                px: 2,
                pt: 1
              })
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: '#1E1F21',
                fontSize: '16px',
                lineHeight: 1.75,
                ...(isMdUp && {
                  height: '55px',
                  display: 'flex',
                  alignItems: 'center'
                })
              }}
            >
              Powiadomienia push:
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43 }}
            >
              Powiadomienia e-mail
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                defaultChecked
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#1E1F21'
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#1E1F21'
                  }
                }}
              />
              <Typography
                variant="body2"
                sx={{ color: '#32343A', fontWeight: 500, fontSize: '14px' }}
              >
                Włączone
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Edit Account Data Modal */}
      <FormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edycja danych konta"
      >
        <EditAccountDataForm
          initialValues={{
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone
          }}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditModalOpen(false)}
          loading={loading}
        />
      </FormModal>

      {/* Change Password Modal */}
      <FormModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Zmień hasło"
      >
        <ChangePasswordForm
          onSubmit={handlePasswordSubmit}
          onCancel={() => setPasswordModalOpen(false)}
          loading={loading}
        />
      </FormModal>
    </Stack>
  );
};

export default SettingsPage;
