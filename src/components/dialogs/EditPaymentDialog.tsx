import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogContent,
  Drawer,
  useMediaQuery,
  useTheme,
  MenuItem,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editPaymentSchema, type EditPaymentFormValues } from '@/utils/formSchemas';
import {
  updatePayment,
  getPaymentFormOptions,
  type PaymentFormOptions,
  type PaymentRecord
} from '@/services/paymentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface EditPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Payment record from the list */
  payment: PaymentRecord | null;
  onSuccess?: () => void;
}

const EditPaymentDialog: React.FC<EditPaymentDialogProps> = ({
  open,
  onClose,
  payment,
  onSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();

  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [formOptions, setFormOptions] = useState<PaymentFormOptions | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors }
  } = useForm<EditPaymentFormValues>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      insurance_company_id: '',
      policy_id: '',
      payment_date: '',
      payment_total: '',
      margin_percent: '',
      status: ''
    }
  });

  /**
   * Parse formatted money string like "1 234,56 zł" back to a numeric value.
   * Returns the raw number (e.g. 1234.56) or empty string if unparseable.
   */
  const parseMoneyString = (formatted: string): string => {
    if (!formatted) return '';
    // Remove currency suffix, spaces, and convert comma to dot
    const cleaned = formatted
      .replace(/[a-zA-Ząćęłńóśźż]+/gi, '') // remove letters (zł etc.)
      .replace(/\s/g, '') // remove spaces
      .replace(',', '.') // comma → dot
      .trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? '' : String(num);
  };

  /**
   * Reverse-lookup: find the form option value that matches the display label from the table record.
   * E.g. table shows "PZU" → find the option where label === "PZU" and return its value.
   */
  const findOptionValue = (
    options: { value: number | string; label: string }[] | undefined,
    displayLabel: string
  ): string | number => {
    if (!options || !displayLabel) return '';
    const match = options.find(
      (o) => o.label.toLowerCase().trim() === displayLabel.toLowerCase().trim()
    );
    return match ? match.value : '';
  };

  // Load form options and populate fields when dialog opens
  const loadFormData = useCallback(async () => {
    if (!payment) return;

    setOptionsLoading(true);
    try {
      const opts = await getPaymentFormOptions();
      setFormOptions(opts);

      // Populate form from payment record + reverse-lookup selects
      const insuranceVal = findOptionValue(
        opts.insurance_companies,
        payment.insurance_company_name
      );
      const policyVal = findOptionValue(opts.policies, payment.policy_number);

      // For status, the table returns human-readable label. Find matching raw value.
      const statusVal = findOptionValue(opts.statuses, payment.status);

      setValue('insurance_company_id', insuranceVal);
      setValue('policy_id', policyVal);
      // Backend returns date as YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
      setValue('payment_date', (payment.payment_date || '').slice(0, 10));
      setValue('payment_total', parseMoneyString(payment.payment_total));
      setValue('margin_percent', payment.margin_percent || '');
      setValue('status', String(statusVal));
    } catch {
      addToast({
        id: crypto.randomUUID(),
        message: 'Nie udało się pobrać opcji formularza',
        severity: 'error'
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [payment, setValue, addToast]);

  useEffect(() => {
    if (open && payment) {
      reset({
        insurance_company_id: '',
        policy_id: '',
        payment_date: '',
        payment_total: '',
        margin_percent: '',
        status: ''
      });
      loadFormData();
    }
  }, [open, payment, reset, loadFormData]);

  const handleFormSubmit = async (data: EditPaymentFormValues) => {
    if (!payment?.id) return;
    setLoading(true);
    try {
      await updatePayment(payment.id, {
        insurance_company_id: Number(data.insurance_company_id),
        policy_id: Number(data.policy_id),
        payment_date: data.payment_date,
        payment_total: Number(data.payment_total),
        margin_percent: Number(data.margin_percent),
        status: data.status as string
      });
      addToast({
        id: crypto.randomUUID(),
        message: 'Płatność została zaktualizowana',
        severity: 'success'
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof EditPaymentFormValues;
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
          message: apiError?.message || 'Nie udało się zaktualizować płatności',
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

  const renderFormContent = () => {
    if (optionsLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ color: '#1E1F21' }} />
        </Box>
      );
    }

    return (
      <Box
        component="form"
        onSubmit={handleSubmit(handleFormSubmit)}
        sx={{
          '& .MuiOutlinedInput-root': { borderRadius: '4px' },
          '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px' }
        }}
      >
        {/* ——— Dane płatności ——— */}
        <Typography
          sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
        >
          Dane płatności
        </Typography>

        <Stack spacing={2.5} sx={{ mb: 2.5 }}>
          {/* Ubezpieczyciel */}
          <Controller
            name="insurance_company_id"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Ubezpieczyciel"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={Boolean(errors.insurance_company_id)}
                helperText={errors.insurance_company_id?.message}
                fullWidth
                size="medium"
              >
                <MenuItem value="">
                  <em>Wybierz ubezpieczyciela</em>
                </MenuItem>
                {formOptions?.insurance_companies?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Polisa */}
          <Controller
            name="policy_id"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Polisa"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={Boolean(errors.policy_id)}
                helperText={errors.policy_id?.message}
                fullWidth
                size="medium"
              >
                <MenuItem value="">
                  <em>Wybierz polisę</em>
                </MenuItem>
                {formOptions?.policies?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Data przelewu */}
          <TextField
            label="Data przelewu"
            type="date"
            {...register('payment_date')}
            error={Boolean(errors.payment_date)}
            helperText={errors.payment_date?.message}
            fullWidth
            size="medium"
            InputLabelProps={{ shrink: true }}
          />

          {/* Kwota raty */}
          <TextField
            label="Wysokość raty (PLN)"
            type="number"
            inputProps={{ step: '0.01', min: '0' }}
            {...register('payment_total')}
            error={Boolean(errors.payment_total)}
            helperText={errors.payment_total?.message}
            fullWidth
            size="medium"
          />

          {/* Procent prowizji */}
          <TextField
            label="Procent prowizji (%)"
            type="number"
            inputProps={{ step: '0.01', min: '0', max: '100' }}
            {...register('margin_percent')}
            error={Boolean(errors.margin_percent)}
            helperText={errors.margin_percent?.message}
            fullWidth
            size="medium"
          />

          {/* Status */}
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Status"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={Boolean(errors.status)}
                helperText={errors.status?.message}
                fullWidth
                size="medium"
              >
                <MenuItem value="">
                  <em>Wybierz status</em>
                </MenuItem>
                {formOptions?.statuses?.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>

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
            startIcon={<SaveOutlinedIcon />}
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
  };

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
        Edytuj płatność
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
        sx={{ zIndex: (theme) => theme.zIndex.modal + 200 }}
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'white', borderRadius: '16px', maxWidth: '600px' }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {renderHeader()}
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
};

export default EditPaymentDialog;
