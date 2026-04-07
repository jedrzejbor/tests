import React, { useEffect, useRef, useState } from 'react';
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
  Checkbox,
  FormControlLabel,
  IconButton,
  Dialog,
  DialogContent,
  Drawer,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editPolicySchema, type EditPolicyFormValues } from '@/utils/formSchemas';
import { translateServerError } from '@/utils/formErrorHelpers';
import {
  updatePolicy,
  getPolicyFormOptions,
  getPolicyDetails,
  type SelectOption,
  type UpdatePolicyFields,
  type PolicyRecord
} from '@/services/policiesService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface EditPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  policy: PolicyRecord | null;
  onSuccess?: () => void;
}

const TOTAL_STEPS = 3;

/**
 * Parse a formatted PLN string like "1 000,00 zł", "500,00 zł", or "PLN 2,000.00" to a number in PLN.
 */
const parsePlnString = (formatted: string): number => {
  if (!formatted) return 0;
  // Remove currency labels and whitespace
  let cleaned = formatted.replace(/PLN|z\u0142/gi, '').trim();
  // If it uses dot as thousands separator and comma as decimal (e.g. "2.000,00")
  if (/\d\.\d{3},\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/\d,\d{3}\.\d{2}$/.test(cleaned) || /^[\d,]+\.\d{1,2}$/.test(cleaned)) {
    // Format like "2,000.00" — comma is thousands separator, dot is decimal
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Format like "1 000,00" — space thousands, comma decimal
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  }
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
};

/**
 * Convert an ISO date string (e.g. "2026-04-08T00:00:00.000000Z") to "YYYY-MM-DD"
 * which is what HTML <input type="date"> expects.
 */
const toDateInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  return iso.slice(0, 10);
};

const EditPolicyDialog: React.FC<EditPolicyDialogProps> = ({
  open,
  onClose,
  policy,
  onSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string>('');

  // Form options
  const [clientOptions, setClientOptions] = useState<SelectOption[]>([]);
  const [insurerOptions, setInsurerOptions] = useState<SelectOption[]>([]);
  const [policyTypeOptions, setPolicyTypeOptions] = useState<SelectOption[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    trigger,
    setValue,
    formState: { errors }
  } = useForm<EditPolicyFormValues>({
    resolver: zodResolver(editPolicySchema),
    defaultValues: {
      client_id: '',
      insurance_company_id: '',
      bank_name: '',
      bank_account_number: '',
      description: '',
      policy_type_id: '',
      car_plates: '',
      number: '',
      date_signed_at: '',
      date_from: '',
      date_to: '',
      city: '',
      payment_total: '',
      margin_percent: '',
      payments_count: '',
      payment_details: [{ amount: '', payment_date: '' }],
      first_update_clause_of_su: false,
      automatic_coverage_clause: false,
      current_assets_settlement_clause: false,
      attachment: undefined,
      keepExistingAttachment: true
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'payment_details'
  });

  const watchedPolicyTypeId = watch('policy_type_id');

  const selectedTypeLabel =
    policyTypeOptions.find((o) => o.value === Number(watchedPolicyTypeId))?.label || '';
  const isCarType = /pojazd|komunikacyj|oc|ac|autocasco/i.test(selectedTypeLabel);

  // Load form options + policy details when dialog opens
  useEffect(() => {
    if (!open || !policy?.id) return;

    const load = async () => {
      setLoadingDetails(true);
      try {
        const [opts, details] = await Promise.all([
          getPolicyFormOptions(),
          getPolicyDetails(policy.id!)
        ]);

        setClientOptions(opts.clients || []);
        setInsurerOptions(opts.insurance_companies || []);
        setPolicyTypeOptions(opts.policy_types || []);

        const p = details.policy;

        // Parse formatted payment_total to PLN value
        const totalPln = parsePlnString(p.payment_total);

        // Map existing payments to form fields
        const paymentDetails = (p.payments || []).map((pm) => ({
          id: pm.id,
          amount: parsePlnString(pm.payment_total),
          payment_date: pm.payment_date
        }));

        setExistingAttachmentUrl(p.attachment || '');

        reset({
          client_id: p.client_id,
          insurance_company_id: p.insurance_company_id,
          bank_name: p.bank_name || '',
          bank_account_number: p.bank_account_number || '',
          description: p.description || '',
          policy_type_id: p.policy_type_id,
          car_plates: p.car_plates || '',
          number: p.number || '',
          date_signed_at: toDateInput(p.date_signed_at),
          date_from: toDateInput(p.date_from),
          date_to: toDateInput(p.date_to),
          city: p.city || '',
          payment_total: totalPln,
          margin_percent: parseFloat(p.margin_percent) || 0,
          payments_count: p.payments_count || paymentDetails.length,
          payment_details:
            paymentDetails.length > 0 ? paymentDetails : [{ amount: '', payment_date: '' }],
          first_update_clause_of_su: p.first_update_clause_of_su,
          automatic_coverage_clause: p.automatic_coverage_clause,
          current_assets_settlement_clause: p.current_assets_settlement_clause,
          attachment: undefined,
          keepExistingAttachment: Boolean(p.attachment)
        });
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się pobrać danych polisy',
          severity: 'error'
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    load();
  }, [open, policy, addToast, reset]);

  // ——— Step navigation ———

  const step1Fields: (keyof EditPolicyFormValues)[] = [
    'client_id',
    'insurance_company_id',
    'bank_name',
    'bank_account_number'
  ];

  const step2Fields: (keyof EditPolicyFormValues)[] = [
    'policy_type_id',
    'number',
    'date_signed_at',
    'date_from',
    'date_to',
    'city'
  ];

  const handleNext = async () => {
    const fieldsToValidate = step === 1 ? step1Fields : step2Fields;
    const valid = await trigger(fieldsToValidate);
    if (!valid) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as 1 | 2 | 3);
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3);
  };

  // ——— Submit ———

  const handleFormSubmit = async (data: EditPolicyFormValues) => {
    if (!policy?.id) return;
    setLoading(true);
    try {
      const payload: UpdatePolicyFields = {
        client_id: Number(data.client_id),
        insurance_company_id: Number(data.insurance_company_id),
        policy_type_id: Number(data.policy_type_id),
        number: data.number,
        car_plates: data.car_plates || null,
        date_signed_at: data.date_signed_at,
        date_from: data.date_from,
        date_to: data.date_to,
        city: data.city,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        description: data.description || null,
        payment_total: Math.round(Number(data.payment_total) * 100), // PLN → grosze
        payment_total_currency: 'PLN',
        margin_percent: Number(data.margin_percent),
        payments_count: Number(data.payments_count),
        first_update_clause_of_su: Boolean(data.first_update_clause_of_su),
        automatic_coverage_clause: Boolean(data.automatic_coverage_clause),
        current_assets_settlement_clause: Boolean(data.current_assets_settlement_clause),
        payment_details: data.payment_details.map((d) => ({
          ...(d.id ? { id: d.id } : {}),
          amount: Math.round(Number(d.amount) * 100), // PLN → grosze
          payment_date: d.payment_date
        }))
      };

      // Handle attachment
      if (data.attachment instanceof File) {
        payload.attachment = data.attachment; // new file
      } else if (!data.keepExistingAttachment && existingAttachmentUrl) {
        payload.attachment = null; // explicitly remove
      }

      await updatePolicy(policy.id, payload);

      addToast({
        id: crypto.randomUUID(),
        message: 'Polisa została zaktualizowana',
        severity: 'success'
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof EditPolicyFormValues;
          if (formField) {
            setError(formField, {
              type: 'server',
              message: translateServerError(messages?.[0] || 'Nieprawidłowa wartość')
            });
          }
        });

        const step1Keys = [
          'client_id',
          'insurance_company_id',
          'bank_name',
          'bank_account_number',
          'description'
        ];
        const step2Keys = [
          'policy_type_id',
          'car_plates',
          'number',
          'date_signed_at',
          'date_from',
          'date_to',
          'city'
        ];
        const errorKeys = Object.keys(apiError.errors);
        if (errorKeys.some((k) => step1Keys.includes(k))) {
          setStep(1);
        } else if (errorKeys.some((k) => step2Keys.includes(k))) {
          setStep(2);
        } else {
          setStep(3);
        }

        addToast({
          id: crypto.randomUUID(),
          message: 'Popraw błędy w formularzu',
          severity: 'error'
        });
      } else {
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się zaktualizować polisy',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep(1);
    setExistingAttachmentUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  // ——— Styling helpers ———
  const menuPaperSx = { bgcolor: 'white', border: '1px solid #D0D5DD' };

  // ——— Progress bar ———
  const renderProgressBar = () => (
    <Box sx={{ px: 1, mb: 2 }}>
      <Stack direction="row" gap={0.5} sx={{ py: 1 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 8,
              borderRadius: '100px',
              bgcolor: i < step ? '#8F6D5F' : '#9E9E9E'
            }}
          />
        ))}
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: '12px', color: '#74767F', letterSpacing: '0.4px' }}>
          Krok
        </Typography>
        <Typography sx={{ fontSize: '12px', color: '#74767F', letterSpacing: '0.4px' }}>
          {step} z {TOTAL_STEPS}
        </Typography>
      </Stack>
    </Box>
  );

  // ——— Step 1 ———
  const renderStep1 = () => (
    <Box>
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Podstawowe dane
      </Typography>

      <Stack spacing={2.5}>
        <Controller
          name="client_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.client_id)}>
              <InputLabel>Firma</InputLabel>
              <Select {...field} label="Firma" MenuProps={{ PaperProps: { sx: menuPaperSx } }}>
                {clientOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.client_id && (
                <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                  {errors.client_id.message}
                </Typography>
              )}
            </FormControl>
          )}
        />

        <Controller
          name="insurance_company_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.insurance_company_id)}>
              <InputLabel>Ubezpieczyciel</InputLabel>
              <Select
                {...field}
                label="Ubezpieczyciel"
                MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              >
                {insurerOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.insurance_company_id && (
                <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                  {errors.insurance_company_id.message}
                </Typography>
              )}
            </FormControl>
          )}
        />

        <TextField
          label="Nazwa banku"
          {...register('bank_name')}
          error={Boolean(errors.bank_name)}
          helperText={errors.bank_name?.message}
          fullWidth
          size="medium"
        />

        <TextField
          label="Numer konta bankowego do zapłaty składki"
          {...register('bank_account_number')}
          error={Boolean(errors.bank_account_number)}
          helperText={errors.bank_account_number?.message}
          fullWidth
          size="medium"
        />

        <TextField
          label="Opis (opcjonalnie)"
          {...register('description')}
          error={Boolean(errors.description)}
          helperText={errors.description?.message}
          fullWidth
          size="medium"
          multiline
          rows={3}
        />
      </Stack>

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
            '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          Anuluj
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 4,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#32343A' }
          }}
        >
          Dalej
        </Button>
      </Stack>
    </Box>
  );

  // ——— Step 2 ———
  const renderStep2 = () => (
    <Box>
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Szczegóły polisy
      </Typography>

      <Stack spacing={2.5}>
        <Controller
          name="policy_type_id"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.policy_type_id)}>
              <InputLabel>Rodzaj polisy</InputLabel>
              <Select
                {...field}
                label="Rodzaj polisy"
                MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              >
                {policyTypeOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.policy_type_id && (
                <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                  {errors.policy_type_id.message}
                </Typography>
              )}
            </FormControl>
          )}
        />

        {isCarType && (
          <TextField
            label="Nr. rejestracyjny"
            {...register('car_plates')}
            error={Boolean(errors.car_plates)}
            helperText={errors.car_plates?.message}
            fullWidth
            size="medium"
          />
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Numer polis"
            {...register('number')}
            error={Boolean(errors.number)}
            helperText={errors.number?.message}
            fullWidth
            size="medium"
          />
          <TextField
            label="Data zawarcia polisy"
            type="date"
            {...register('date_signed_at')}
            error={Boolean(errors.date_signed_at)}
            helperText={errors.date_signed_at?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Początek obowiązywania polisy"
            type="date"
            {...register('date_from')}
            error={Boolean(errors.date_from)}
            helperText={errors.date_from?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Koniec obowiązywania polisy"
            type="date"
            {...register('date_to')}
            error={Boolean(errors.date_to)}
            helperText={errors.date_to?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <TextField
          label="Miasto"
          {...register('city')}
          error={Boolean(errors.city)}
          helperText={errors.city?.message}
          fullWidth
          size="medium"
        />
      </Stack>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          Wróć
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 4,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#32343A' }
          }}
        >
          Dalej
        </Button>
      </Stack>
    </Box>
  );

  // ——— Step 3 ———
  const watchedAttachment = watch('attachment');
  const watchedKeepExisting = watch('keepExistingAttachment');

  const renderStep3 = () => (
    <Box>
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Szczegóły składki
      </Typography>

      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Wysokość składki"
            {...register('payment_total')}
            error={Boolean(errors.payment_total)}
            helperText={errors.payment_total?.message}
            fullWidth
            size="medium"
            type="number"
            inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            label="Procent prowizji"
            {...register('margin_percent')}
            error={Boolean(errors.margin_percent)}
            helperText={errors.margin_percent?.message}
            fullWidth
            size="medium"
            type="number"
            inputProps={{ step: '0.01', min: '0', max: '100' }}
          />
        </Stack>

        <Controller
          name="payments_count"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth size="medium" error={Boolean(errors.payments_count)}>
              <InputLabel>Ilość rat</InputLabel>
              <Select {...field} label="Ilość rat" MenuProps={{ PaperProps: { sx: menuPaperSx } }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
              {errors.payments_count && (
                <Typography variant="caption" color="error" sx={{ ml: 1.5, mt: 0.5 }}>
                  {errors.payments_count.message}
                </Typography>
              )}
            </FormControl>
          )}
        />

        {/* Payment details rows */}
        {fields.map((field, index) => (
          <Stack
            key={field.id}
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems="flex-start"
          >
            <Typography
              sx={{
                fontSize: '14px',
                color: '#74767F',
                minWidth: 20,
                pt: 2,
                textAlign: 'center'
              }}
            >
              {index + 1}
            </Typography>
            <TextField
              label={`Wartość ${index === 0 ? 'pierwszej' : index === 1 ? 'drugiej' : `${index + 1}.`} składki`}
              {...register(`payment_details.${index}.amount`)}
              error={Boolean(errors.payment_details?.[index]?.amount)}
              helperText={errors.payment_details?.[index]?.amount?.message}
              fullWidth
              size="medium"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              label={`Termin spłaty ${index === 0 ? 'pierwszej' : index === 1 ? 'drugiej' : `${index + 1}.`} składki`}
              type="date"
              {...register(`payment_details.${index}.payment_date`)}
              error={Boolean(errors.payment_details?.[index]?.payment_date)}
              helperText={errors.payment_details?.[index]?.payment_date?.message}
              fullWidth
              size="medium"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        ))}
      </Stack>

      {/* File upload */}
      <Typography
        sx={{
          fontSize: '14px',
          color: 'rgba(0,0,0,0.6)',
          letterSpacing: '0.17px',
          mt: 3,
          mb: 1.5
        }}
      >
        Dodaj pliki, maksymalny rozmiar pliku 10 MB
      </Typography>

      <Controller
        name="attachment"
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 2.5 }}>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".doc,.docx,.pdf,.xlsx,.xls,.zip,.rar,.7z,.gz,.tar,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  field.onChange(file);
                  setValue('keepExistingAttachment', false);
                }
                e.target.value = '';
              }}
            />

            {/* New file selected */}
            {watchedAttachment instanceof File ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', px: 2, py: 1.5 }}
              >
                <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
                <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                  {watchedAttachment.name}
                </Typography>
                <Chip
                  label={`${(watchedAttachment.size / 1024 / 1024).toFixed(1)} MB`}
                  size="small"
                  sx={{ bgcolor: '#F3F4F6', fontSize: '12px' }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    field.onChange(undefined);
                    setValue('keepExistingAttachment', Boolean(existingAttachmentUrl));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                </IconButton>
              </Stack>
            ) : existingAttachmentUrl && watchedKeepExisting ? (
              /* Existing attachment kept */
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ border: '1px solid #E5E7EB', borderRadius: '8px', px: 2, py: 1.5 }}
              >
                <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
                <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                  Istniejący załącznik
                </Typography>
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ textTransform: 'none', fontSize: '13px', color: '#8F6D5F' }}
                >
                  Zmień
                </Button>
                <IconButton size="small" onClick={() => setValue('keepExistingAttachment', false)}>
                  <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                </IconButton>
              </Stack>
            ) : (
              /* No file — upload prompt */
              <Button
                variant="outlined"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{
                  borderStyle: 'dashed',
                  borderColor: errors.attachment ? '#EF4444' : '#D0D5DD',
                  color: '#74767F',
                  borderRadius: '8px',
                  py: 3,
                  textTransform: 'none',
                  fontSize: '14px',
                  '&:hover': { borderColor: '#1E1F21', bgcolor: 'rgba(0,0,0,0.02)' }
                }}
              >
                Wybierz plik
              </Button>
            )}

            {errors.attachment && (
              <Typography sx={{ fontSize: '12px', color: '#EF4444', mt: 0.5, ml: 1.5 }}>
                {typeof errors.attachment.message === 'string' ? errors.attachment.message : ''}
              </Typography>
            )}
          </Box>
        )}
      />

      {/* Clauses */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 1 }}
      >
        Polisa zawiera
      </Typography>

      <Stack spacing={0}>
        <Controller
          name="first_update_clause_of_su"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                  sx={{ '&.Mui-checked': { color: '#1E1F21' } }}
                />
              }
              label="Klauzulę pierwszej aktualizacji SU"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px' } }}
            />
          )}
        />

        <Controller
          name="automatic_coverage_clause"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                  sx={{ '&.Mui-checked': { color: '#1E1F21' } }}
                />
              }
              label="Klauzulę automatycznego pokrycia"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px' } }}
            />
          )}
        />

        <Controller
          name="current_assets_settlement_clause"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(field.value)}
                  onChange={(e) => field.onChange(e.target.checked)}
                  sx={{ '&.Mui-checked': { color: '#1E1F21' } }}
                />
              }
              label="Klauzulę rozliczenia środków obrotowych"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px' } }}
            />
          )}
        />
      </Stack>

      {/* Submit */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          Wróć
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

  // ——— Header ———
  const renderHeader = () => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 1, minHeight: '48px' }}
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
        Edytuj polisę
      </Typography>
      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  // ——— Content ———
  const content = loadingDetails ? (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography sx={{ color: '#74767F' }}>Ładowanie danych polisy…</Typography>
    </Box>
  ) : (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      sx={{
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px' }
      }}
    >
      {renderProgressBar()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </Box>
  );

  if (!policy) return null;

  // ——— Render ———
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 200 }}
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '95vh',
            p: 3,
            overflow: 'auto'
          }
        }}
      >
        {renderHeader()}
        {content}
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
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default EditPolicyDialog;
