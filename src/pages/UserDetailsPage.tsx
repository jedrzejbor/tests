import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import EditUserDialog from '@/components/dialogs/EditUserDialog';
import DeleteUserDialog from '@/components/dialogs/DeleteUserDialog';
import type { EditUserFormValues } from '@/utils/formSchemas';
import { type UserRecord, getUserDetails, type UserDetailsApiUser } from '@/services/usersService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

// Extended user data matching our forms
interface UserDetailsData {
  id: string | number;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  account_type: string;
  status: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  position?: string;
  competencies?: string[];
  managingEntities?: (string | number)[];
  dependentEntities?: (string | number)[];
}

// Reusable field component for desktop grid (same pattern as SettingsPage)
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
      sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43, letterSpacing: '0.17px' }}
    >
      {label}
    </Typography>
    {children || (
      <Typography
        variant="body2"
        sx={{
          color: '#32343A',
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: 1.57,
          letterSpacing: '0.1px'
        }}
      >
        {value || '-'}
      </Typography>
    )}
  </Box>
);

// Reusable mobile field row (horizontal label-value like SettingsPage)
const MobileFieldRow = ({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ height: 40, px: 1.5, py: 0.75 }}
  >
    <Typography
      sx={{
        color: '#74767F',
        fontSize: '14px',
        lineHeight: 1.43,
        letterSpacing: '0.17px'
      }}
    >
      {label}
    </Typography>
    {children || (
      <Typography
        sx={{
          color: '#32343A',
          fontSize: '12px',
          lineHeight: '16px'
        }}
      >
        {value || '-'}
      </Typography>
    )}
  </Stack>
);

const UserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { addToast } = useUiStore();

  const [userData, setUserData] = useState<UserDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Mobile collapsible sections
  const [accountSectionOpen, setAccountSectionOpen] = useState(true);
  const [personalSectionOpen, setPersonalSectionOpen] = useState(true);
  const [relationsSectionOpen, setRelationsSectionOpen] = useState(true);

  const mapFromStateUser = (stateUser: UserRecord): UserDetailsData => {
    const nameParts = stateUser.full_name?.split(' ') || [];

    return {
      id: stateUser.id || userId || '',
      full_name: stateUser.full_name,
      company: stateUser.company,
      email: stateUser.email,
      phone: stateUser.phone,
      account_type: stateUser.account_type,
      status: stateUser.status,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      role: ((stateUser as Record<string, unknown>).role as string) || 'Klient user',
      position: ((stateUser as Record<string, unknown>).position as string) || '',
      competencies: ((stateUser as Record<string, unknown>).competencies as string[]) || [],
      managingEntities: ((stateUser as Record<string, unknown>).managingEntities as string[]) || [],
      dependentEntities:
        ((stateUser as Record<string, unknown>).dependentEntities as string[]) || []
    };
  };

  const mapFromApiUser = (apiUser: UserDetailsApiUser, stateUser?: UserRecord): UserDetailsData => {
    const fullName = [apiUser.firstname, apiUser.lastname].filter(Boolean).join(' ').trim();
    const fallbackName = stateUser?.full_name || '-';
    const nameParts = fullName ? fullName.split(' ') : fallbackName.split(' ');

    return {
      id: apiUser.id ?? stateUser?.id ?? userId ?? '',
      full_name: fullName || fallbackName,
      company: stateUser?.company || '-',
      email: apiUser.email || stateUser?.email || '-',
      phone: apiUser.phone || stateUser?.phone || '-',
      account_type: stateUser?.account_type || '-',
      status: stateUser?.status || 'aktywny',
      firstName: apiUser.firstname || nameParts[0] || '',
      lastName: apiUser.lastname || nameParts.slice(1).join(' ') || '',
      role: ((stateUser as Record<string, unknown>)?.role as string) || 'Klient user',
      position:
        apiUser.position || ((stateUser as Record<string, unknown>)?.position as string) || '',
      competencies: ((stateUser as Record<string, unknown>)?.competencies as string[]) || [],
      managingEntities:
        ((stateUser as Record<string, unknown>)?.managingEntities as string[]) || [],
      dependentEntities:
        ((stateUser as Record<string, unknown>)?.dependentEntities as string[]) || []
    };
  };

  // Fetch user data — use router state for instant render, then refresh from API
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const stateUser = (location.state as { user?: UserRecord })?.user;

      try {
        if (stateUser) {
          setUserData(mapFromStateUser(stateUser));
        }

        if (!userId) {
          if (!stateUser) setUserData(null);
          return;
        }

        const response = await getUserDetails(userId);
        setUserData(mapFromApiUser(response.user, stateUser));
      } catch (error) {
        const apiError = error as ApiError;

        if (apiError?.status === 401) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Sesja wygasła. Zaloguj się ponownie.',
            severity: 'error'
          });
        } else if (apiError?.status === 404) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Nie znaleziono użytkownika',
            severity: 'error'
          });
          setUserData(null);
        } else if (apiError?.status === 403) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Brak uprawnień do podglądu użytkownika',
            severity: 'error'
          });
          setUserData(null);
        } else {
          addToast({
            id: crypto.randomUUID(),
            message: 'Nie udało się pobrać danych użytkownika',
            severity: 'error'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, addToast, location.state]);

  const handleBack = () => {
    navigate('/app/users');
  };

  const handleEditUser = () => {
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
  };

  const handleUserUpdated = useCallback(
    (data: EditUserFormValues) => {
      addToast({
        id: crypto.randomUUID(),
        message: `Użytkownik ${data.email} został zaktualizowany`,
        severity: 'success'
      });
      setUserData((previous) => {
        if (!previous) return previous;

        const fullName = `${data.firstName} ${data.lastName}`.trim();

        return {
          ...previous,
          full_name: fullName || previous.full_name,
          email: data.email,
          phone: data.phone,
          status: data.status,
          role: (data.role as string) ?? previous.role,
          position: data.position,
          competencies: data.competencies as unknown as string[],
          company: (data.company as string) ?? previous.company,
          account_type: data.accountType,
          managingEntities: data.managingEntities,
          dependentEntities: data.dependentEntities,
          firstName: data.firstName,
          lastName: data.lastName
        };
      });
    },
    [addToast]
  );

  const handleDeleteUser = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleUserDeleted = useCallback(async () => {
    if (!userData) return;

    addToast({
      id: crypto.randomUUID(),
      message: `Użytkownik ${userData.full_name} został usunięty`,
      severity: 'success'
    });
    navigate('/app/users');
  }, [userData, addToast, navigate]);

  // Convert to UserRecord for dialogs
  const userRecord: UserRecord | null = userData
    ? {
        id: userData.id,
        full_name: userData.full_name,
        company: userData.company,
        email: userData.email,
        phone: userData.phone,
        account_type: userData.account_type,
        status: userData.status
      }
    : null;

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Ładowanie danych użytkownika...</Typography>
      </Box>
    );
  }

  if (!userData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Nie znaleziono użytkownika</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Wróć do listy
        </Button>
      </Box>
    );
  }

  // Status chip
  const StatusChip = () => (
    <Chip
      label={userData.status === 'aktywny' ? 'Aktywny' : 'Nieaktywny'}
      size="small"
      icon={
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: userData.status === 'aktywny' ? '#4CAF50' : '#757575',
            ml: 1
          }}
        />
      }
      sx={{
        bgcolor: userData.status === 'aktywny' ? '#E8F5E9' : '#F5F5F5',
        color: userData.status === 'aktywny' ? '#2E7D32' : '#757575',
        fontWeight: 400,
        fontSize: '12px',
        height: '20px',
        '& .MuiChip-icon': { mr: 0, ml: 1 },
        '& .MuiChip-label': { px: '6px' }
      }}
    />
  );

  // Account type badge
  const AccountTypeBadge = () => (
    <Chip
      label={userData.account_type || 'Firma'}
      size="small"
      sx={{
        bgcolor: '#E7E8EB',
        color: '#32343A',
        fontSize: '12px',
        height: '18px',
        borderRadius: '16px',
        '& .MuiChip-label': { px: 1 }
      }}
    />
  );

  // Collapsible section header for mobile (matching Figma pattern)
  const MobileSectionHeader = ({
    title,
    open,
    onToggle
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
  }) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        bgcolor: 'rgba(143, 109, 95, 0.04)',
        borderRadius: '8px',
        py: 0.75,
        px: 1.5
      }}
    >
      <Typography
        sx={{
          fontWeight: 500,
          color: '#32343A',
          fontSize: '14px',
          lineHeight: 1.57,
          letterSpacing: '0.1px'
        }}
      >
        {title}
      </Typography>
      <IconButton size="small" onClick={onToggle}>
        <ExpandMoreIcon
          sx={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        />
      </IconButton>
    </Stack>
  );

  // ---- MOBILE VIEW ----
  if (!isMdUp) {
    return (
      <Stack
        spacing={2}
        sx={{
          bgcolor: 'white',
          borderRadius: 4,
          pb: 2,
          height: '100%',
          overflow: 'auto'
        }}
      >
        {/* Mobile header: arrow + name */}
        <Box
          sx={{
            borderBottom: '1px solid #D0D5DD',
            py: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5 }}>
            <IconButton
              onClick={handleBack}
              sx={{
                borderRadius: '8px',
                p: 1
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 300,
                color: '#32343A',
                lineHeight: '32px',
                letterSpacing: '-0.4px'
              }}
            >
              {userData.full_name}
            </Typography>
          </Stack>
        </Box>

        {/* "Dane użytkownika" top label */}
        <Box sx={{ px: 1 }}>
          <Box
            sx={{
              bgcolor: 'rgba(143, 109, 95, 0.08)',
              borderRadius: '8px',
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <PersonOutlineIcon sx={{ fontSize: 20, color: '#7A5D51' }} />
            <Typography
              sx={{
                color: '#7A5D51',
                fontSize: '16px',
                lineHeight: 1.75,
                letterSpacing: '0.15px'
              }}
            >
              Dane użytkownika
            </Typography>
          </Box>
        </Box>

        {/* Main content card */}
        <Box sx={{ px: 1 }}>
          <Card
            sx={{
              borderRadius: '8px',
              boxShadow: 'none',
              border: '1px solid rgba(143, 109, 95, 0.12)',
              p: 2
            }}
          >
            <Stack spacing={1}>
              {/* Section 1: Dane ogólne użytkownika */}
              <MobileSectionHeader
                title="Dane ogólne użytkownika"
                open={accountSectionOpen}
                onToggle={() => setAccountSectionOpen((v) => !v)}
              />
              <Collapse in={accountSectionOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Rodzaj konta">
                    <AccountTypeBadge />
                  </MobileFieldRow>
                  <MobileFieldRow label="Nazwa firmy" value={userData.company} />
                  <MobileFieldRow label="Rola w systemie" value={userData.role} />
                  <MobileFieldRow label="Status">
                    <StatusChip />
                  </MobileFieldRow>
                  <MobileFieldRow
                    label="Zakres kompetencji"
                    value={userData.competencies?.join(', ') || '-'}
                  />
                </Stack>
              </Collapse>

              {/* Section 2: Dane personalne */}
              <MobileSectionHeader
                title="Dane personalne"
                open={personalSectionOpen}
                onToggle={() => setPersonalSectionOpen((v) => !v)}
              />
              <Collapse in={personalSectionOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Imię i nazwisko" value={userData.full_name} />
                  <MobileFieldRow label="Stanowisko" value={userData.position} />
                  <MobileFieldRow label="Numer telefonu" value={userData.phone} />
                  <MobileFieldRow label="Email" value={userData.email} />
                </Stack>
              </Collapse>

              {/* Section 3: Powiązania */}
              <MobileSectionHeader
                title="Powiązania"
                open={relationsSectionOpen}
                onToggle={() => setRelationsSectionOpen((v) => !v)}
              />
              <Collapse in={relationsSectionOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow
                    label="Podmiot zarządzający"
                    value={userData.managingEntities?.join(', ') || '-'}
                  />
                  <MobileFieldRow
                    label="Podmiot zależny"
                    value={userData.dependentEntities?.join(', ') || '-'}
                  />
                </Stack>
              </Collapse>
            </Stack>
          </Card>
        </Box>

        {/* Mobile action buttons */}
        <Stack direction="row" spacing={2} sx={{ px: 2, mt: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
            onClick={handleEditUser}
            sx={{
              borderColor: '#494B54',
              color: '#494B54',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none'
            }}
          >
            edytuj
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
            onClick={handleDeleteUser}
            sx={{
              borderColor: '#D0D5DD',
              color: '#1E1F21',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none'
            }}
          >
            usuń
          </Button>
        </Stack>

        {/* Dialogs */}
        <EditUserDialog
          open={editDialogOpen}
          onClose={handleEditDialogClose}
          user={userRecord}
          onSuccess={handleUserUpdated}
        />
        <DeleteUserDialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          user={userRecord}
          onSuccess={handleUserDeleted}
        />
      </Stack>
    );
  }

  // ---- DESKTOP VIEW ----
  return (
    <Stack
      spacing={3}
      sx={{
        bgcolor: 'white',
        borderRadius: 1,
        py: 3,
        px: 3,
        height: '100%'
      }}
    >
      {/* Header: name + action buttons */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography
          sx={{
            fontSize: '32px',
            fontWeight: 300,
            color: '#32343A',
            letterSpacing: '0.25px',
            lineHeight: 1.235
          }}
        >
          {userData.full_name}
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDeleteUser}
            sx={{
              borderColor: '#D0D5DD',
              color: '#1E1F21',
              borderRadius: '8px',
              px: 2.25,
              py: 1,
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
              '&:hover': {
                borderColor: '#D0D5DD',
                bgcolor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            Usuń klienta
          </Button>
        </Stack>
      </Stack>

      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 300,
          color: '#32343A',
          lineHeight: 1.334
        }}
      >
        Szczegółowe dane użytkownika:
      </Typography>

      {/* Section 1: Account information */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header with title and edit button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'rgba(143, 109, 95, 0.12)',
              pb: 0.75,
              px: 1.5,
              mb: 2
            }}
          >
            <Typography
              sx={{
                fontWeight: 400,
                color: '#1E1F21',
                fontSize: '16px',
                lineHeight: 1.75,
                letterSpacing: '0.15px'
              }}
            >
              Szczegółowe informacje o koncie użytkownika
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={handleEditUser}
              sx={{
                borderColor: '#494B54',
                color: '#494B54',
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#32343A',
                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Edytuj
            </Button>
          </Stack>

          <Box sx={{ px: 0 }}>
            {/* Row 1: Rodzaj konta, Nazwa firmy, Rola w systemie, Zakres kompetencji, Status */}
            <Stack direction="row">
              <FieldItem label="Rodzaj konta">
                <AccountTypeBadge />
              </FieldItem>
              <FieldItem label="Nazwa firmy" value={userData.company} />
              <FieldItem label="Rola w systemie" value={userData.role} />
              <FieldItem
                label="Zakres kompetencji"
                value={userData.competencies?.join(', ') || '-'}
              />
              <FieldItem label="Status">
                <StatusChip />
              </FieldItem>
            </Stack>
            {/* Row 2: Podmioty zarządzające, Podmioty zależne */}
            <Stack direction="row">
              <FieldItem
                label="Podmioty zarządzające"
                value={userData.managingEntities?.join(', ') || '-'}
              />
              <FieldItem
                label="Podmioty zależne"
                value={userData.dependentEntities?.join(', ') || '-'}
              />
              {/* Invisible spacers to match 5-column grid */}
              <Box sx={{ flex: 1, p: 1.5 }} />
              <Box sx={{ flex: 1, p: 1.5 }} />
              <Box sx={{ flex: 1, p: 1.5 }} />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Section 2: Personal details */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header with title and edit button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              borderBottom: '1px solid',
              borderColor: 'rgba(143, 109, 95, 0.12)',
              pb: 0.75,
              px: 1.5,
              mb: 2
            }}
          >
            <Typography
              sx={{
                fontWeight: 400,
                color: '#1E1F21',
                fontSize: '16px',
                lineHeight: 1.75,
                letterSpacing: '0.15px'
              }}
            >
              Szczegółowe dane personalne :
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={handleEditUser}
              sx={{
                borderColor: '#494B54',
                color: '#494B54',
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#32343A',
                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Edytuj
            </Button>
          </Stack>

          <Box sx={{ px: 0 }}>
            <Stack direction="row">
              <FieldItem label="Imię i nazwisko" value={userData.full_name} />
              <FieldItem label="Numer telefonu" value={userData.phone} />
              <FieldItem label="Email" value={userData.email} />
              <FieldItem label="Stanowisko" value={userData.position} />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        user={userRecord}
        onSuccess={handleUserUpdated}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        user={userRecord}
        onSuccess={handleUserDeleted}
      />
    </Stack>
  );
};

export default UserDetailsPage;
