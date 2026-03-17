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
  Switch,
  Chip,
  Autocomplete,
  Tooltip,
  useMediaQuery,
  useTheme,
  IconButton,
  Dialog,
  DialogContent,
  Drawer
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addClientSchema, type AddClientFormValues } from '@/utils/formSchemas';
import {
  createClient,
  getClientFormOptions,
  type AuthorityScopeOption,
  type ParentClientOption
} from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data: AddClientFormValues) => void;
}

const STATUSES = [
  { value: 'active', label: 'Aktywny' },
  { value: 'inactive', label: 'Nieaktywny' }
];

const AddClientDialog: React.FC<AddClientDialogProps> = ({ open, onClose, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();

  const [loading, setLoading] = useState(false);
  const [authorityScopeOptions, setAuthorityScopeOptions] = useState<AuthorityScopeOption[]>([]);
  const [parentClientOptions, setParentClientOptions] = useState<ParentClientOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors }
  } = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: '',
      authority_scope: '',
      type: 'company',
      nip: '',
      regon: '',
      krs: '',
      website: '',
      bank_account: '',
      street: '',
      street_no: '',
      city: '',
      postal: '',
      phone: '',
      status: 'active',
      hasRelations: false,
      parentClientId: undefined,
      childClientIds: []
    }
  });

  const hasRelations = watch('hasRelations');

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      try {
        const response = await getClientFormOptions();
        setAuthorityScopeOptions(response.authority_scope || []);
        const rawClients = response.clients || [];
        const normalizedClients: ParentClientOption[] = Array.isArray(rawClients)
          ? rawClients
          : Object.values(rawClients);
        setParentClientOptions(normalizedClients);
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

  const handleFormSubmit = async (data: AddClientFormValues) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        client_parent_id:
          data.hasRelations && data.parentClientId ? data.parentClientId : undefined,
        client_children_ids:
          data.hasRelations && data.childClientIds?.length ? data.childClientIds : undefined,
        authority_scope: data.authority_scope,
        type: 'company',
        nip: data.nip || undefined,
        regon: data.regon || undefined,
        krs: data.krs || undefined,
        website: data.website || undefined,
        bank_account: data.bank_account || undefined,
        street: data.street || undefined,
        street_no: data.street_no || undefined,
        city: data.city || undefined,
        postal: data.postal || undefined,
        phone: data.phone || undefined,
        status: data.status as 'active' | 'inactive'
      };

      await createClient(payload);
      onSuccess?.(data);
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof AddClientFormValues;
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
          message: apiError?.message || 'Nie udało się utworzyć klienta',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ——— Select menu paper style ———
  const menuPaperSx = { bgcolor: 'white', border: '1px solid #D0D5DD' };

  const renderFormContent = () => (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      sx={{
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px' }
      }}
    >
      {/* ——— Dane firmy ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Dane firmy
      </Typography>

      <Stack spacing={2.5} sx={{ mb: 2.5 }}>
        <TextField
          label="Nazwa klienta"
          {...register('name')}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          fullWidth
          size="medium"
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Controller
            name="authority_scope"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium" error={Boolean(errors.authority_scope)}>
                <InputLabel>Zakres umocowania</InputLabel>
                <Select
                  {...field}
                  label="Zakres umocowania"
                  MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                >
                  {authorityScopeOptions.map((a) => (
                    <MenuItem key={a.value} value={a.value}>
                      {a.label}
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
              <FormControl fullWidth size="medium" error={Boolean(errors.status)}>
                <InputLabel>Status</InputLabel>
                <Select {...field} label="Status" MenuProps={{ PaperProps: { sx: menuPaperSx } }}>
                  {STATUSES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Stack>
      </Stack>

      {/* ——— Dane rejestrowe ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Dane rejestrowe
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField
          label="NIP"
          {...register('nip')}
          error={Boolean(errors.nip)}
          helperText={errors.nip?.message}
          fullWidth
          size="medium"
        />
        <TextField
          label="REGON"
          {...register('regon')}
          error={Boolean(errors.regon)}
          helperText={errors.regon?.message}
          fullWidth
          size="medium"
        />
        <TextField
          label="KRS"
          {...register('krs')}
          error={Boolean(errors.krs)}
          helperText={errors.krs?.message}
          fullWidth
          size="medium"
        />
      </Stack>

      {/* ——— Adres i kontakt ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Adres i kontakt
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField label="Ulica" {...register('street')} fullWidth size="medium" />
        <TextField
          label="Nr budynku/lokalu"
          {...register('street_no')}
          fullWidth
          size="medium"
          sx={{ maxWidth: { md: 160 } }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField label="Miasto" {...register('city')} fullWidth size="medium" />
        <Controller
          name="postal"
          control={control}
          render={({ field }) => {
            const formatPostal = (value: string) => {
              const digits = (value || '').replace(/\D/g, '').slice(0, 5);
              if (digits.length <= 2) return digits;
              return digits.slice(0, 2) + '-' + digits.slice(2);
            };

            return (
              <TextField
                label="Kod pocztowy"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(formatPostal(e.target.value))}
                onBlur={field.onBlur}
                fullWidth
                size="medium"
                InputLabelProps={{ shrink: true }}
                sx={{ maxWidth: { md: 200 } }}
              />
            );
          }}
        />
      </Stack>

      <TextField
        label="Telefon"
        {...register('phone')}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message}
        fullWidth
        size="medium"
        sx={{ mb: 2.5 }}
      />

      <TextField
        label="Strona www (opcjonalnie)"
        {...register('website')}
        fullWidth
        size="medium"
        sx={{ mb: 2.5 }}
      />

      <TextField
        label="Nr konta bankowego"
        {...register('bank_account')}
        fullWidth
        size="medium"
        sx={{ mb: 2.5 }}
      />

      {/* ——— Podmiot ma powiązania ——— */}
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
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#1E1F21' },
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
            name="parentClientId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={parentClientOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                value={parentClientOptions.find((c) => c.value === field.value) ?? null}
                onChange={(_, newValue) => field.onChange(newValue?.value ?? undefined)}
                slotProps={{ paper: { sx: { bgcolor: 'white', border: '1px solid #D0D5DD' } } }}
                renderOption={(props, option) => (
                  <li {...props} key={option.value}>
                    {option.label}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="Podmiot zarządzający" size="medium" />
                )}
                sx={{ flex: 1 }}
              />
            )}
          />

          <Tooltip
            title="Przypisanie podmiotu zależnego jest niedostępne, możliwe tylko poprzez edycję innego podmiotu i przypisanie mu podmiotu zarządzającego"
            placement="top"
            arrow
          >
            <span style={{ flex: 1 }}>
              <Controller
                name="childClientIds"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    disabled
                    options={parentClientOptions}
                    onOpen={() => console.log(parentClientOptions, 'test')}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    value={parentClientOptions.filter((c) => field.value?.includes(c.value))}
                    onChange={(_, newValue) => field.onChange(newValue.map((v) => v.value))}
                    slotProps={{ paper: { sx: { bgcolor: 'white', border: '1px solid #D0D5DD' } } }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.value}>
                        {option.label}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Podmioty zależne" size="medium" />
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
                            border: '1px solid rgba(0,0,0,0.5)',
                            bgcolor: 'transparent'
                          }}
                        />
                      ))
                    }
                    sx={{ flex: 1, width: '100%' }}
                  />
                )}
              />
            </span>
          </Tooltip>
        </Stack>
      )}

      {/* ——— Przyciski ——— */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 2.75,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#32343A' }
          }}
        >
          Dodaj klienta
        </Button>
      </Stack>
    </Box>
  );

  // ——— Header ———
  const renderHeader = () => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 3, minHeight: '48px' }}
    >
      <Typography
        sx={{
          fontSize: '20px',
          fontWeight: 300,
          color: 'rgba(0,0,0,0.87)',
          letterSpacing: '0.15px',
          lineHeight: 1.6
        }}
      >
        Dodaj nowego klienta
      </Typography>
      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  // ——— Render ———
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '95vh',
            p: 3
          }
        }}
      >
        {renderHeader()}
        {renderFormContent()}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'white', borderRadius: '16px', maxWidth: '720px' }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {renderHeader()}
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
