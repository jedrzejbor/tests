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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addClientSchema, type AddClientFormValues } from '@/utils/formSchemas';
import {
  createClient,
  getClientFormOptions,
  type AuthorityScopeOption,
  type ClientTypeOption,
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
  const [typeOptions, setTypeOptions] = useState<ClientTypeOption[]>([]);
  const [parentClientOptions, setParentClientOptions] = useState<ParentClientOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors }
  } = useForm<AddClientFormValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: '',
      client_parent_id: '',
      authority_scope: '',
      type: '',
      nip: '',
      regon: '',
      krs: '',
      street: '',
      street_no: '',
      city: '',
      postal: '',
      phone: '',
      status: 'active'
    }
  });

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      try {
        const response = await getClientFormOptions();
        setAuthorityScopeOptions(response.authority_scope || []);
        setTypeOptions(response.type || []);
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
        client_parent_id: data.client_parent_id ? Number(data.client_parent_id) : undefined,
        authority_scope: data.authority_scope,
        type: data.type,
        nip: data.nip || undefined,
        regon: data.regon || undefined,
        krs: data.krs || undefined,
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
      {/* ——— Dane podstawowe ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Dane podstawowe
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
            name="type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium" error={Boolean(errors.type)}>
                <InputLabel>Typ klienta</InputLabel>
                <Select
                  {...field}
                  label="Typ klienta"
                  MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                >
                  {typeOptions.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="authority_scope"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium" error={Boolean(errors.authority_scope)}>
                <InputLabel>Zakres pełnomocnictwa</InputLabel>
                <Select
                  {...field}
                  label="Zakres pełnomocnictwa"
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
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Controller
            name="client_parent_id"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth size="medium">
                <InputLabel>Podmiot zarządzający</InputLabel>
                <Select
                  {...field}
                  label="Podmiot zarządzający"
                  MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                >
                  <MenuItem value="">
                    <em>Brak</em>
                  </MenuItem>
                  {parentClientOptions.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
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
          label="Nr budynku"
          {...register('street_no')}
          fullWidth
          size="medium"
          sx={{ maxWidth: { md: 160 } }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField label="Miasto" {...register('city')} fullWidth size="medium" />
        <TextField
          label="Kod pocztowy"
          {...register('postal')}
          fullWidth
          size="medium"
          sx={{ maxWidth: { md: 200 } }}
        />
      </Stack>

      <TextField
        label="Telefon"
        {...register('phone')}
        error={Boolean(errors.phone)}
        helperText={errors.phone?.message}
        fullWidth
        size="medium"
        sx={{ mb: 3 }}
      />

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
        Dodaj klienta
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
