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
  useMediaQuery,
  useTheme,
  IconButton,
  Dialog,
  DialogContent,
  Drawer
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editClientSchema, type EditClientFormValues } from '@/utils/formSchemas';
import {
  getClientFormOptions,
  getClientDetails,
  updateClient,
  type AuthorityScopeOption,
  type ClientTypeOption,
  type ParentClientOption,
  type ClientRecord
} from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface EditClientDialogProps {
  open: boolean;
  onClose: () => void;
  client: ClientRecord | null;
  onSuccess?: (data: EditClientFormValues) => void;
}

const STATUSES = [
  { value: 'active', label: 'Aktywny' },
  { value: 'inactive', label: 'Nieaktywny' }
];

const EditClientDialog: React.FC<EditClientDialogProps> = ({
  open,
  onClose,
  client,
  onSuccess
}) => {
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
  } = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
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

  // Load form options + client details in parallel
  useEffect(() => {
    if (!open || !client?.id) return;

    const load = async () => {
      try {
        const [optionsResp, detailsResp] = await Promise.all([
          getClientFormOptions(),
          getClientDetails(client.id!)
        ]);

        // Options
        setAuthorityScopeOptions(optionsResp.authority_scope || []);
        setTypeOptions(optionsResp.type || []);
        const rawClients = optionsResp.clients || [];
        const normalizedClients: ParentClientOption[] = Array.isArray(rawClients)
          ? rawClients
          : Object.values(rawClients);
        setParentClientOptions(normalizedClients);

        // Map details to form
        const c = detailsResp.client;

        // Map backend status string to form value
        let statusValue = 'active';
        if (c.status) {
          const lower = c.status.toLowerCase();
          if (lower === 'inactive' || lower.includes('nieaktywny') || lower.includes('nie aktywny'))
            statusValue = 'inactive';
          else statusValue = 'active';
        }

        reset({
          name: c.name || '',
          client_parent_id: c.client_parent_id ?? '',
          authority_scope: c.authority_scope || '',
          type: c.type || '',
          nip: c.nip || '',
          regon: c.regon || '',
          krs: c.krs || '',
          street: c.street || '',
          street_no: c.street_no || '',
          city: c.city || '',
          postal: c.postal || '',
          phone: c.phone || '',
          status: statusValue
        });
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się pobrać danych klienta',
          severity: 'error'
        });
      }
    };

    load();
  }, [open, client, reset, addToast]);

  const handleFormSubmit = async (data: EditClientFormValues) => {
    setLoading(true);
    try {
      if (!client?.id) {
        addToast({
          id: crypto.randomUUID(),
          message: 'Brak identyfikatora klienta',
          severity: 'error'
        });
        setLoading(false);
        return;
      }

      const payload = {
        name: data.name,
        client_parent_id: data.client_parent_id ? Number(data.client_parent_id) : null,
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

      await updateClient(client.id, payload);
      onSuccess?.(data);
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof EditClientFormValues;
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
    onClose();
  };

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
          InputLabelProps={{ shrink: true }}
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
                  {parentClientOptions
                    .filter((c) => c.value !== Number(client?.id))
                    .map((c) => (
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
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="REGON"
          {...register('regon')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="KRS"
          {...register('krs')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {/* ——— Adres i kontakt ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Adres i kontakt
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField
          label="Ulica"
          {...register('street')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Nr budynku"
          {...register('street_no')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: { md: 160 } }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
        <TextField
          label="Miasto"
          {...register('city')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Kod pocztowy"
          {...register('postal')}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
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
        InputLabelProps={{ shrink: true }}
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
          Zapisz zmiany
        </Button>
      </Stack>
    </Box>
  );

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
        Edytuj klienta
      </Typography>
      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

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

export default EditClientDialog;
