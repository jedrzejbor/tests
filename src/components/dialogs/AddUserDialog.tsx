import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
  Dialog,
  DialogContent,
  Drawer
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addUserSchema, type AddUserFormValues } from '@/utils/formSchemas';
import { onlyDigitsKeyDown, translateServerError } from '@/utils/formErrorHelpers';
import {
  createUser,
  getUserCreateOptions,
  type RoleOption,
  type CompanyOption
} from '@/services/usersService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: AddUserFormValues, password?: string) => void;
}

const POSITIONS = [
  { value: 'dyrektor', label: 'Dyrektor' },
  { value: 'kierownik', label: 'Kierownik' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'asystent', label: 'Asystent' }
];

const CLIFFSIDE_ADMIN_ROLES = ['Super Admin Cliffside Brokers', 'Admin Cliffside Brokers'];

const MARKETING_CONSENT = [
  { value: 'tak', label: 'Tak' },
  { value: 'nie', label: 'Nie' }
];

const STATUSES = [
  { value: 'aktywny', label: 'Aktywny' },
  { value: 'nieaktywny', label: 'Nieaktywny' }
];

// ENTITIES constant removed (was used only for 'Podmiot ma powiązania' UI)

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      role: '',
      company: '',
      firstName: '',
      lastName: '',
      position: '',
      competencies: [],
      phone: '',
      email: '',
      marketingConsent: '',
      status: 'aktywny',
      _companyNotRequired: false
    }
  });

  const watchedRole = watch('role');
  useEffect(() => {
    const label = roleOptions.find((r) => r.value === watchedRole)?.label ?? '';
    setValue('_companyNotRequired', CLIFFSIDE_ADMIN_ROLES.includes(label));
  }, [watchedRole, roleOptions, setValue]);

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      try {
        const response = await getUserCreateOptions();
        // Backend may return roles as object {"1": {value,label}, ...} or array
        const rawRoles = response.roles || [];
        const normalizedRoles: RoleOption[] = Array.isArray(rawRoles)
          ? rawRoles
          : Object.values(rawRoles);
        setRoleOptions(normalizedRoles);
        // Backend may return companies as object or array of {value,label} or strings
        const rawCompanies = response.companies || [];
        const normalizedCompanies: CompanyOption[] = Array.isArray(rawCompanies)
          ? rawCompanies.map((c) => (typeof c === 'string' ? { value: 0, label: c } : c))
          : Object.values(rawCompanies);
        setCompanyOptions(normalizedCompanies);
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się pobrać opcji formularza',
          severity: 'error'
        });
      }
    };

    loadOptions();
  }, [open, addToast]);

  const handleFormSubmit = async (data: AddUserFormValues) => {
    setLoading(true);
    try {
      const status: 'active' | 'inactive' = data.status === 'aktywny' ? 'active' : 'inactive';

      const payload = {
        firstname: data.firstName,
        lastname: data.lastName,
        position: data.position || undefined,
        phone: data.phone,
        email: data.email,
        role: Number(data.role),
        status,
        scopes_of_competence: data.competencies?.length ? data.competencies : undefined,
        company: data.company ? Number(data.company) : undefined,
        marketing_consent:
          data.marketingConsent === 'tak' ? true : data.marketingConsent === 'nie' ? false : null
      };

      const response = await createUser(payload);

      setCreatedEmail(response.user?.email || data.email);
      setStep(2);

      // Callback for parent component
      onSuccess?.(data);
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        const fieldMap: Partial<Record<string, keyof AddUserFormValues>> = {
          firstname: 'firstName',
          lastname: 'lastName',
          scopes_of_competence: 'competencies'
        };

        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = fieldMap[field] || (field as keyof AddUserFormValues);
          if (formField) {
            setError(formField, {
              type: 'server',
              message: translateServerError(messages?.[0] || 'Nieprawidłowa wartość')
            });
          }
        });

        addToast({
          id: crypto.randomUUID(),
          message: 'Popraw błędy w formularzu',
          severity: 'error'
        });
      } else {
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się utworzyć użytkownika',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    reset();
    setStep(1);
    setCreatedEmail('');
  };

  const handleClose = () => {
    reset();
    setStep(1);
    setCreatedEmail('');
    onClose();
  };

  // Progress bar
  const renderProgressBar = () => (
    <Box sx={{ px: 1, mb: 2 }}>
      <Stack direction="row" gap={0.5} sx={{ py: 1 }}>
        <Box
          sx={{
            flex: 1,
            height: 8,
            borderRadius: '100px',
            bgcolor: '#8F6D5F'
          }}
        />
        <Box
          sx={{
            flex: 1,
            height: 8,
            borderRadius: '100px',
            bgcolor: step === 2 ? '#8F6D5F' : '#9E9E9E'
          }}
        />
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography
          sx={{
            fontSize: '12px',
            color: '#74767F',
            letterSpacing: '0.4px'
          }}
        >
          Krok
        </Typography>
        <Typography
          sx={{
            fontSize: '12px',
            color: '#74767F',
            letterSpacing: '0.4px'
          }}
        >
          {step} z 2
        </Typography>
      </Stack>
    </Box>
  );

  // Step 1: Form fields
  const renderStep1Content = () => (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      sx={{
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px' },
        '& .MuiAutocomplete-root .MuiOutlinedInput-root': { borderRadius: '4px' }
      }}
    >
      <Typography
        sx={{
          fontSize: '14px',
          color: 'rgba(0, 0, 0, 0.6)',
          letterSpacing: '0.17px',
          mb: 2.5
        }}
      >
        Dane użytkownika
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.role)}>
              <InputLabel>Rola w systemie</InputLabel>
              <Select
                {...field}
                label="Rola w systemie"
                MenuProps={{
                  PaperProps: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
              >
                {roleOptions.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <Controller
          name="company"
          control={control}
          render={({ field: companyField }) => (
            <Controller
              name="role"
              control={control}
              render={({ field: roleField }) => {
                const selectedRoleLabel =
                  roleOptions.find((r) => r.value === roleField.value)?.label ?? '';
                const isCliffsideRole = CLIFFSIDE_ADMIN_ROLES.includes(selectedRoleLabel);
                // Reset company value when Cliffside role is selected
                if (isCliffsideRole && companyField.value !== '') {
                  setTimeout(() => companyField.onChange(''), 0);
                }
                return (
                  <FormControl
                    fullWidth
                    size="medium"
                    error={Boolean(errors.company)}
                    disabled={isCliffsideRole}
                  >
                    <InputLabel>Firma</InputLabel>
                    <Select
                      {...companyField}
                      value={isCliffsideRole ? '' : companyField.value}
                      label="Firma"
                      MenuProps={{
                        PaperProps: {
                          sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                        }
                      }}
                    >
                      {companyOptions.map((company) => (
                        <MenuItem key={company.value} value={company.value}>
                          {company.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }}
            />
          )}
        />
      </Stack>

      {/* Dane użytkownika */}
      <Typography
        sx={{
          fontSize: '14px',
          color: 'rgba(0, 0, 0, 0.6)',
          letterSpacing: '0.17px',
          mb: 2.5
        }}
      >
        Dane użytkownika
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField
          label="Imię"
          {...register('firstName')}
          error={Boolean(errors.firstName)}
          helperText={errors.firstName?.message}
          fullWidth
          size="medium"
        />
        <TextField
          label="Nazwisko"
          {...register('lastName')}
          error={Boolean(errors.lastName)}
          helperText={errors.lastName?.message}
          fullWidth
          size="medium"
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <Controller
          name="position"
          control={control}
          render={({ field }) => (
            <FormControl size="medium" sx={{ flex: 1 }}>
              <InputLabel>Stanowisko</InputLabel>
              <Select
                {...field}
                label="Stanowisko"
                MenuProps={{
                  PaperProps: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
              >
                {POSITIONS.map((pos) => (
                  <MenuItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.status)} sx={{ flex: 1 }}>
              <InputLabel>Status użytkownika</InputLabel>
              <Select
                {...field}
                label="Status użytkownika"
                MenuProps={{
                  PaperProps: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
              >
                {STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField
          label="Telefon"
          {...register('phone')}
          error={Boolean(errors.phone)}
          helperText={errors.phone?.message}
          fullWidth
          size="medium"
          inputProps={{ inputMode: 'numeric', maxLength: 11, pattern: '[0-9]*' }}
          onKeyDown={onlyDigitsKeyDown}
        />
        <TextField
          label="Email"
          type="email"
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          fullWidth
          size="medium"
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <Controller
          name="marketingConsent"
          control={control}
          render={({ field }) => (
            <FormControl size="medium" fullWidth error={Boolean(errors.marketingConsent)}>
              <InputLabel>Zgody marketingowe</InputLabel>
              <Select
                {...field}
                label="Zgody marketingowe"
                MenuProps={{
                  PaperProps: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
              >
                {MARKETING_CONSENT.map((consent) => (
                  <MenuItem key={consent.value} value={consent.value}>
                    {consent.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.marketingConsent && (
                <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                  {errors.marketingConsent.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
        {/* Empty box to keep 2-column layout */}
        <Box sx={{ flex: 1 }} />
      </Stack>

      {/* Removed 'Podmiot ma powiązania' section per request */}

      {/* Action buttons */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 3,
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
          Anuluj
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 4,
            py: 1,
            minWidth: 140,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': {
              bgcolor: '#32343A'
            }
          }}
        >
          Dalej
        </Button>
      </Stack>
    </Box>
  );

  // Step 2: Success / Credentials display
  const renderStep2Content = () => (
    <Box>
      <Typography
        sx={{
          fontSize: '14px',
          color: 'rgba(0, 0, 0, 0.6)',
          letterSpacing: '0.17px',
          mb: 3
        }}
      >
        Utworzono nowe konto użytkownika
      </Typography>

      {/* Credentials card */}
      <Box
        sx={{
          border: '1px solid rgba(143, 109, 95, 0.12)',
          borderRadius: '8px',
          px: 2,
          py: 1
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ py: 1.5, px: 1.5 }}
        >
          <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Login</Typography>
          <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
            {createdEmail}
          </Typography>
        </Stack>
      </Box>

      {/* Email notification info */}
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        sx={{
          mt: 3,
          p: 2,
          bgcolor: 'rgba(143, 109, 95, 0.06)',
          borderRadius: '8px'
        }}
      >
        <MailOutlineIcon sx={{ color: '#8F6D5F', fontSize: 20, mt: 0.25 }} />
        <Typography
          sx={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'rgba(0, 0, 0, 0.6)'
          }}
        >
          Na adres <strong>{createdEmail}</strong> został wysłany e-mail z linkiem do ustawienia
          hasła do konta. Link jest ważny przez 48 godzin.
        </Typography>
      </Stack>

      {/* Action buttons */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddAnother}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 3,
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
          Dodaj następnego użytkownika
        </Button>
        <Button
          variant="contained"
          onClick={handleClose}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': {
              bgcolor: '#32343A'
            }
          }}
        >
          Zakończ
        </Button>
      </Stack>
    </Box>
  );

  // Dialog content
  const content = (
    <Box sx={{ pb: 3 }}>
      {renderProgressBar()}
      {step === 1 ? renderStep1Content() : renderStep2Content()}
    </Box>
  );

  // Mobile: Drawer from bottom
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 200,
          '& .MuiDrawer-paper': {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '90vh',
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ pb: 3, pt: 1 }}>
          {/* Header with close button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ px: 2, pt: 1 }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 300,
                fontSize: '20px',
                lineHeight: 1.6,
                letterSpacing: '0.15px',
                color: 'rgba(0, 0, 0, 0.87)'
              }}
            >
              Dodaj nowego użytkownika
            </Typography>
            <IconButton onClick={handleClose} size="small" aria-label="Zamknij">
              <CloseIcon sx={{ color: '#8E9098' }} />
            </IconButton>
          </Stack>

          {/* Content */}
          <Box sx={{ px: 2, pt: 2 }}>{content}</Box>
        </Box>
      </Drawer>
    );
  }

  // Desktop: centered Dialog
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: 672
        }
      }}
    >
      <DialogContent sx={{ p: 2, pt: 2, backgroundColor: theme.palette.background.paper }}>
        {/* Header with title and close button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 300,
              fontSize: '20px',
              lineHeight: 1.6,
              letterSpacing: '0.15px',
              color: 'rgba(0, 0, 0, 0.87)'
            }}
          >
            Dodaj nowego użytkownika
          </Typography>
          <IconButton onClick={handleClose} size="medium" aria-label="Zamknij">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>

        {/* Content */}
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
