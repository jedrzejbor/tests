import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Divider,
  Dialog,
  DialogContent,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { forceDeletePayment, type PaymentRecord } from '@/services/paymentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

interface ForceDeletePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  onSuccess?: () => void;
}

const ForceDeletePaymentDialog: React.FC<ForceDeletePaymentDialogProps> = ({
  open,
  onClose,
  payment,
  onSuccess
}) => {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleForceDelete = async () => {
    setLoading(true);
    setPasswordError(null);
    try {
      if (!payment?.id) throw new Error('Brak identyfikatora płatności');

      await forceDeletePayment(payment.id, password);
      addToast({
        id: crypto.randomUUID(),
        message: 'Płatność została trwale usunięta',
        severity: 'success'
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422) {
        const fieldError = apiError.errors?.password?.[0];
        if (fieldError) {
          setPasswordError(fieldError);
          return;
        }
      }

      const message = apiError?.message || 'Wystąpił błąd podczas usuwania płatności';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setPasswordError(null);
    setShowPassword(false);
    setStep(1);
    onClose();
  };

  const step1Content = (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 300,
            color: 'rgba(0,0,0,0.87)',
            letterSpacing: '0.15px',
            lineHeight: 1.6
          }}
        >
          Czy na pewno chcesz trwale usunąć
          <br />
          płatność?
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Typography
        sx={{
          fontSize: '14px',
          color: '#EF4444',
          letterSpacing: '0.17px',
          lineHeight: 1.43,
          mb: 3
        }}
      >
        Uwaga! Tej operacji nie można cofnąć. Płatność zostanie trwale usunięta.
      </Typography>

      {/* Payment details card */}
      <Box sx={{ border: '1px solid rgba(143,109,95,0.12)', borderRadius: '8px', px: 2, mb: 2 }}>
        <Stack spacing={0}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Ubezpieczyciel</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A' }}>
              {payment?.insurance_company_name || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Numer polisy</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {payment?.policy_number || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Kwota raty</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {payment?.payment_total || '-'}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
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
          variant="contained"
          onClick={() => setStep(2)}
          sx={{
            bgcolor: '#EF4444',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#DC2626' }
          }}
        >
          Usuń trwale
        </Button>
      </Stack>
    </Box>
  );

  const step2Content = (
    <Box sx={{ p: 3 }}>
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
          Potwierdź trwałe usunięcie płatności
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Typography
        sx={{
          fontSize: '14px',
          color: '#74767F',
          letterSpacing: '0.17px',
          lineHeight: 1.43,
          mb: 3
        }}
      >
        Podaj hasło używane do logowania do systemu, aby trwale usunąć płatność
      </Typography>

      <TextField
        label="Hasło"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (passwordError) setPasswordError(null);
        }}
        fullWidth
        size="medium"
        error={Boolean(passwordError)}
        helperText={passwordError || ' '}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
      />

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
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
          variant="contained"
          onClick={handleForceDelete}
          disabled={loading || !password.trim()}
          sx={{
            bgcolor: '#EF4444',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#DC2626' }
          }}
        >
          Usuń trwale
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'white', borderRadius: '16px', maxWidth: '600px' } }}
    >
      <DialogContent sx={{ p: 0 }}>{step === 1 ? step1Content : step2Content}</DialogContent>
    </Dialog>
  );
};

export default ForceDeletePaymentDialog;
