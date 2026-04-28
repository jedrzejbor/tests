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
import AddIcon from '@mui/icons-material/Add';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addPolicySchema, type AddPolicyFormValues } from '@/utils/formSchemas';
import { translateServerError } from '@/utils/formErrorHelpers';
import {
  createPolicy,
  getPolicyFormOptions,
  type SelectOption,
  type CreatePolicyFields
} from '@/services/policiesService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface AddPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When provided, pre-selects and locks the client dropdown */
  clientId?: number;
}

const TOTAL_STEPS = 3;

const AddPolicyDialog: React.FC<AddPolicyDialogProps> = ({
  open,
  onClose,
  onSuccess,
  clientId: preselectedClientId
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

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
    clearErrors,
    formState: { errors }
  } = useForm<AddPolicyFormValues>({
    resolver: zodResolver(addPolicySchema),
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
      attachment: undefined
    }
  });

  const { fields, append, replace } = useFieldArray({
    control,
    name: 'payment_details'
  });

  const watchedPaymentsCount = watch('payments_count');
  const watchedPolicyTypeId = watch('policy_type_id');
  const watchedPaymentDetails = watch('payment_details');
  const watchedPaymentTotal = watch('payment_total');

  // Calculate remaining amount (payment_total - sum of all amounts)
  const paymentTotalNum = Number(watchedPaymentTotal) || 0;
  const paymentDetailsSum = (watchedPaymentDetails || []).reduce(
    (acc, d) => acc + (Number(d?.amount) || 0),
    0
  );
  const remainingAmount = Math.round((paymentTotalNum - paymentDetailsSum) * 100) / 100;

  // Determine if selected policy type is a car type (name contains "Pojazd" or "komunikacyj")
  const selectedTypeLabel =
    policyTypeOptions.find((o) => o.value === Number(watchedPolicyTypeId))?.label || '';
  const isCarType = /pojazd|komunikacyj|oc|ac|autocasco/i.test(selectedTypeLabel);

  // Clear / re-show sum-check errors on all payment_details amount fields
  // whenever any amount or payment_total changes.
  useEffect(() => {
    const details = watchedPaymentDetails || [];
    const hasAmountErrors = details.some((_, i) => errors.payment_details?.[i]?.amount);
    if (!hasAmountErrors) return;

    const total = Number(watchedPaymentTotal) || 0;
    const sum = details.reduce((acc, d) => acc + (Number(d?.amount) || 0), 0);
    const sumMismatch = Math.round(sum * 100) !== Math.round(total * 100);

    if (!sumMismatch) {
      // Sum is now valid — clear all amount errors at once
      details.forEach((_, i) => clearErrors(`payment_details.${i}.amount`));
    }
  }, [paymentDetailsSum, watchedPaymentTotal]);

  // Sync payment_details rows with payments_count
  useEffect(() => {
    const count = Number(watchedPaymentsCount) || 0;
    if (count < 1) return;
    const current = fields.length;
    if (count > current) {
      for (let i = current; i < count; i++) {
        append({ amount: '', payment_date: '' }, { shouldFocus: false });
      }
    } else if (count < current) {
      const newDetails = fields.slice(0, count).map((f) => ({
        amount: f.amount,
        payment_date: f.payment_date
      }));
      replace(newDetails);
    }
  }, [watchedPaymentsCount]);

  // Load form options when dialog opens
  useEffect(() => {
    if (!open) return;
    const loadOptions = async () => {
      try {
        const opts = await getPolicyFormOptions();
        setClientOptions(opts.clients || []);
        setInsurerOptions(opts.insurance_companies || []);
        setPolicyTypeOptions(opts.policy_types || []);

        // Pre-select client if provided via prop
        if (preselectedClientId) {
          reset((prev) => ({ ...prev, client_id: preselectedClientId }));
        }
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

  // ——— Step navigation ———

  const step1Fields: (keyof AddPolicyFormValues)[] = [
    'client_id',
    'insurance_company_id',
    'bank_name',
    'bank_account_number'
  ];

  const step2Fields: (keyof AddPolicyFormValues)[] = [
    'policy_type_id',
    'number',
    'date_signed_at',
    'date_from',
    'date_to'
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

  const handleFormSubmit = async (data: AddPolicyFormValues) => {
    setLoading(true);
    try {
      const payload: CreatePolicyFields = {
        client_id: Number(data.client_id),
        insurance_company_id: Number(data.insurance_company_id),
        policy_type_id: Number(data.policy_type_id),
        number: data.number,
        car_plates: data.car_plates || null,
        date_signed_at: data.date_signed_at,
        date_from: data.date_from,
        date_to: data.date_to,
        city: '',
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
        attachment: data.attachment instanceof File ? data.attachment : null,
        payment_details: data.payment_details.map((d) => ({
          amount: Math.round(Number(d.amount) * 100), // PLN → grosze
          payment_date: d.payment_date
        }))
      };

      await createPolicy(payload);

      addToast({
        id: crypto.randomUUID(),
        message: 'Polisa została utworzona',
        severity: 'success'
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof AddPolicyFormValues;
          if (formField) {
            setError(formField, {
              type: 'server',
              message: translateServerError(messages?.[0] || 'Nieprawidłowa wartość')
            });
          }
        });

        // Navigate to first step with error
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
          'date_to'
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
          message: apiError?.message || 'Nie udało się utworzyć polisy',
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

  // ——— Step 1: Podstawowe dane ———
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
              <Select
                {...field}
                label="Firma"
                disabled={Boolean(preselectedClientId)}
                MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              >
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

      {/* Nav buttons */}
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

  // ——— Step 2: Szczegóły polisy ———
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
            label="Numer polisy"
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

  // ——— Step 3: Szczegóły składki ———
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
            inputProps={{ step: '0.01', min: '0', max: '10000000' }}
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
        {paymentTotalNum > 0 && fields.length > 0 && (
          <Typography
            sx={{
              fontSize: '13px',
              color: remainingAmount < 0 ? 'error.main' : 'text.secondary',
              fontWeight: remainingAmount < 0 ? 600 : 400
            }}
          >
            Pozostała kwota do rozpisania: {remainingAmount.toFixed(2)} PLN z{' '}
            {paymentTotalNum.toFixed(2)} PLN
          </Typography>
        )}
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
              label={`Wartość ${index + 1}. składki`}
              {...register(`payment_details.${index}.amount`)}
              error={Boolean(errors.payment_details?.[index]?.amount)}
              helperText={
                errors.payment_details?.[index]?.amount?.message?.trim()
                  ? errors.payment_details[index].amount.message
                  : undefined
              }
              fullWidth
              size="medium"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              label={`Termin spłaty ${index + 1}. składki`}
              type="date"
              {...register(`payment_details.${index}.payment_date`)}
              error={Boolean(errors.payment_details?.[index]?.payment_date)}
              helperText={errors.payment_details?.[index]?.payment_date?.message}
              fullWidth
              size="medium"
              InputLabelProps={{ shrink: true }}
              inputProps={{
                ...(index > 0 && watchedPaymentDetails?.[index - 1]?.payment_date
                  ? { min: watchedPaymentDetails[index - 1].payment_date }
                  : {})
              }}
            />
          </Stack>
        ))}
      </Stack>

      {/* File upload */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mt: 3, mb: 1.5 }}
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
                if (file) field.onChange(file);
                e.target.value = '';
              }}
            />

            {field.value instanceof File ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  px: 2,
                  py: 1.5
                }}
              >
                <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
                <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                  {field.value.name}
                </Typography>
                <Chip
                  label={`${(field.value.size / 1024 / 1024).toFixed(1)} MB`}
                  size="small"
                  sx={{ bgcolor: '#F3F4F6', fontSize: '12px' }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    field.onChange(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                </IconButton>
              </Stack>
            ) : (
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

      {/* Submit buttons */}
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
          Wyślij
        </Button>
      </Stack>
    </Box>
  );

  // Navigate to first step with validation errors
  const handleValidationErrors = (fieldErrors: Record<string, unknown>) => {
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
      'date_to'
    ];
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.some((k) => step1Keys.includes(k))) {
      setStep(1);
    } else if (errorKeys.some((k) => step2Keys.includes(k))) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

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
        Dodaj nową polisę
      </Typography>
      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  // ——— Content ———
  const content = (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit, handleValidationErrors)}
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

export default AddPolicyDialog;
