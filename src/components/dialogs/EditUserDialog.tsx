import React, { useState, useEffect } from 'react';
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
  Switch,
  Chip,
  Divider,
  Autocomplete,
  useMediaQuery,
  useTheme,
  IconButton,
  Dialog,
  DialogContent,
  Drawer
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editUserSchema, type EditUserFormValues } from '@/utils/formSchemas';
import { generateSecurePassword } from '@/utils/passwordGenerator';
import type { UserRecord } from '@/services/usersService';
import {
  getUserCreateOptions,
  updateUser,
  getUserDetails,
  type RoleOption,
  type CompanyOption
} from '@/services/usersService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onSuccess?: (data: EditUserFormValues) => void;
}

const POSITIONS = [
  { value: 'dyrektor', label: 'Dyrektor' },
  { value: 'kierownik', label: 'Kierownik' },
  { value: 'specjalista', label: 'Specjalista' },
  { value: 'asystent', label: 'Asystent' }
];

const ACCOUNT_TYPES = [
  { value: 'firma', label: 'Firma' },
  { value: 'osoba_fizyczna', label: 'Osoba fizyczna' }
];

const MARKETING_CONSENT = [
  { value: 'tak', label: 'Tak' },
  { value: 'nie', label: 'Nie' }
];

const STATUSES = [
  { value: 'aktywny', label: 'Aktywny' },
  { value: 'nieaktywny', label: 'Nieaktywny' }
];

const ENTITIES = [
  { value: 'maspex', label: 'Maspex' },
  { value: 'kubus', label: 'Kubuś' },
  { value: 'twix', label: 'Twix' },
  { value: 'lubella', label: 'Lubella' }
];

const EditUserDialog: React.FC<EditUserDialogProps> = ({ open, onClose, user, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();

  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [competencyOptions, setCompetencyOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors }
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
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
      accountType: '',
      status: 'aktywny',
      hasRelations: false,
      managingEntities: [],
      dependentEntities: []
    }
  });

  const hasRelations = watch('hasRelations');

  // Single effect: load form options AND user details together so company/role
  // lookups always have fresh options available (avoids race condition where
  // fetchDetails ran before loadOptions finished setting state).
  useEffect(() => {
    if (!open || !user?.id) return;

    const loadOptionsAndDetails = async () => {
      try {
        // Fetch both in parallel
        const [optionsResponse, detailsResponse] = await Promise.all([
          getUserCreateOptions(),
          getUserDetails(user.id)
        ]);

        // --- Normalize options ---
        const rawRoles = optionsResponse.roles || [];
        const normalizedRoles: RoleOption[] = Array.isArray(rawRoles)
          ? rawRoles
          : Object.values(rawRoles);
        setRoleOptions(normalizedRoles);

        const rawCompanies = optionsResponse.companies || [];
        const normalizedCompanies: CompanyOption[] = Array.isArray(rawCompanies)
          ? rawCompanies.map((c) => (typeof c === 'string' ? { value: 0, label: c } : c))
          : Object.values(rawCompanies);
        setCompanyOptions(normalizedCompanies);

        setCompetencyOptions(optionsResponse.scopes_of_competence || []);

        // --- Map user details using freshly loaded options ---
        const userDetails = detailsResponse.user;

        // Role: backend returns numeric id or string label
        let roleValue: string | number = '';
        if (userDetails.role !== null && userDetails.role !== undefined) {
          if (typeof userDetails.role === 'string') {
            const matched = normalizedRoles.find((r) => r.label === userDetails.role);
            roleValue = matched ? matched.value : '';
          } else {
            roleValue = userDetails.role;
          }
        }

        // Company: prefer client_id (numeric) returned directly by backend;
        // fall back to matching string company name against options list.
        let companyValue: string | number = '';
        if (userDetails.client_id !== null && userDetails.client_id !== undefined) {
          companyValue = userDetails.client_id;
        } else if (userDetails.company !== null && userDetails.company !== undefined) {
          if (typeof userDetails.company === 'string') {
            const matched = normalizedCompanies.find((c) => c.label === userDetails.company);
            companyValue = matched ? matched.value : '';
          } else {
            companyValue = userDetails.company;
          }
        }

        reset({
          role: roleValue,
          company: companyValue,
          firstName: userDetails.firstname || user.full_name?.split(' ')[0] || '',
          lastName: userDetails.lastname || user.full_name?.split(' ').slice(1).join(' ') || '',
          position: userDetails.position || '',
          competencies: userDetails.scopes_of_competence || [],
          phone: userDetails.phone || user.phone || '',
          email: userDetails.email || user.email || '',
          marketingConsent:
            userDetails.marketing_consent === true
              ? 'tak'
              : userDetails.marketing_consent === false
                ? 'nie'
                : '',
          accountType: user.account_type || '',
          status: userDetails.status || user.status || 'aktywny',
          hasRelations: false,
          managingEntities: [],
          dependentEntities: []
        });
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się pobrać danych użytkownika',
          severity: 'error'
        });
      }
    };

    loadOptionsAndDetails();
  }, [open, user, reset, addToast]);

  // Generate new password when toggle is enabled
  // Generate new password when button is clicked
  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(10);
    setGeneratedPassword(newPassword);
  };

  const handleFormSubmit = async (data: EditUserFormValues) => {
    setLoading(true);
    try {
      if (!user?.id) {
        addToast({
          id: crypto.randomUUID(),
          message: 'Brak identyfikatora użytkownika',
          severity: 'error'
        });
        setLoading(false);
        return;
      }

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
          data.marketingConsent === 'tak' ? true : data.marketingConsent === 'nie' ? false : null,
        ...(generatedPassword
          ? { password: generatedPassword, password_confirmation: generatedPassword }
          : {})
      };

      await updateUser(user.id, payload);

      onSuccess?.(data as EditUserFormValues);
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        const fieldMap: Partial<Record<string, keyof EditUserFormValues>> = {
          firstname: 'firstName',
          lastname: 'lastName',
          scopes_of_competence: 'competencies',
          marketing_consent: 'marketingConsent'
        };

        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = fieldMap[field] || (field as keyof EditUserFormValues);
          if (formField) {
            setError(formField, {
              type: 'server',
              message: messages?.[0] || 'Nieprawidłowa wartość'
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
          message: apiError?.message || 'Nie udało się zapisać zmian',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setGeneratedPassword('');
    onClose();
  };

  // Form content
  const renderFormContent = () => (
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
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.company)}>
              <InputLabel>Firma</InputLabel>
              <Select
                {...field}
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

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {/* Left column */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Imię"
            {...register('firstName')}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />

          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <FormControl size="medium" fullWidth>
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

          <TextField
            label="Telefon"
            {...register('phone')}
            error={Boolean(errors.phone)}
            helperText={errors.phone?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />

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

          <Controller
            name="accountType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium" error={Boolean(errors.accountType)}>
                <InputLabel>Rodzaj konta</InputLabel>
                <Select
                  {...field}
                  label="Rodzaj konta"
                  MenuProps={{
                    PaperProps: {
                      sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                    }
                  }}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Box>

        {/* Right column */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Nazwisko"
            {...register('lastName')}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />

          <Controller
            name="competencies"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={competencyOptions}
                getOptionLabel={(option) => option}
                value={competencyOptions.filter((c) => field.value?.includes(c))}
                onChange={(_, newValue) => {
                  field.onChange(newValue);
                }}
                slotProps={{
                  paper: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Zakres kompetencji" size="medium" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      size="small"
                      {...getTagProps({ index })}
                      key={option}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid rgba(0, 0, 0, 0.5)',
                        bgcolor: 'transparent'
                      }}
                    />
                  ))
                }
                sx={{ flex: 1 }}
              />
            )}
          />

          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium" error={Boolean(errors.status)}>
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
        </Box>
      </Stack>

      {/* Podmiot ma powiązania */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '16px', color: '#000', letterSpacing: '0.15px' }}>
          Podmiot ma powiązania
        </Typography>
        <Controller
          name="hasRelations"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#1E1F21'
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#1E1F21'
                }
              }}
            />
          )}
        />
      </Stack>

      {hasRelations && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Controller
            name="managingEntities"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={ENTITIES}
                getOptionLabel={(option) => option.label}
                value={ENTITIES.filter((e) => field.value?.includes(e.value))}
                onChange={(_, newValue) => {
                  field.onChange(newValue.map((v) => v.value));
                }}
                slotProps={{
                  paper: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Wybierz podmioty zarządzające" size="medium" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.label}
                      size="small"
                      {...getTagProps({ index })}
                      key={option.value}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid rgba(0, 0, 0, 0.5)',
                        bgcolor: 'transparent'
                      }}
                    />
                  ))
                }
                sx={{ flex: 1 }}
              />
            )}
          />

          <Controller
            name="dependentEntities"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={ENTITIES}
                getOptionLabel={(option) => option.label}
                value={ENTITIES.filter((e) => field.value?.includes(e.value))}
                onChange={(_, newValue) => {
                  field.onChange(newValue.map((v) => v.value));
                }}
                slotProps={{
                  paper: {
                    sx: { bgcolor: 'white', border: '1px solid #D0D5DD' }
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Wybierz podmioty zależne" size="medium" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.label}
                      size="small"
                      {...getTagProps({ index })}
                      key={option.value}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid rgba(0, 0, 0, 0.5)',
                        bgcolor: 'transparent'
                      }}
                    />
                  ))
                }
                sx={{ flex: 1 }}
              />
            )}
          />
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Generate new password section */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={handleGeneratePassword}
          startIcon={<LockIcon />}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 2,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            mb: generatedPassword ? 2 : 0,
            '&:hover': {
              borderColor: '#1E1F21',
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          Wygeneruj nowe hasło
        </Button>

        {generatedPassword && (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              value={generatedPassword}
              fullWidth
              size="medium"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      // Optional: Show toast notification
                    }}
                    size="small"
                    sx={{ mr: -0.5 }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#F9FAFB'
                }
              }}
            />
          </Stack>
        )}
      </Box>

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
          Zapisz zmiany
        </Button>
      </Stack>
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
          zIndex: (theme) => theme.zIndex.modal + 100,
          '& .MuiDrawer-paper': {
            backgroundColor: theme.palette.background.paper,
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
            sx={{ px: 2, pt: 1, mb: 2 }}
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
              Edytuj użytkownika
            </Typography>
            <IconButton onClick={handleClose} size="small" aria-label="Zamknij">
              <CloseIcon sx={{ color: '#8E9098' }} />
            </IconButton>
          </Stack>

          {/* Content */}
          <Box sx={{ px: 2 }}>{renderFormContent()}</Box>
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
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
            Edytuj użytkownika
          </Typography>
          <IconButton onClick={handleClose} size="medium" aria-label="Zamknij">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>

        {/* Content */}
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
