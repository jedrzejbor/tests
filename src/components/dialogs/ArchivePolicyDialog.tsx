import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogContent,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { archivePolicy, type PolicyRecord } from '@/services/policiesService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

interface ArchivePolicyDialogProps {
  open: boolean;
  onClose: () => void;
  policy: PolicyRecord | null;
  onSuccess?: () => void;
}

const ArchivePolicyDialog: React.FC<ArchivePolicyDialogProps> = ({
  open,
  onClose,
  policy,
  onSuccess
}) => {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleArchive = async () => {
    setLoading(true);
    setPasswordError(null);
    try {
      if (!policy?.id) {
        throw new Error('Brak identyfikatora polisy');
      }

      await archivePolicy(policy.id, password);
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

      const message = apiError?.message || 'Wystąpił błąd podczas archiwizacji polisy';
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

  const handleContinueToPassword = () => {
    setStep(2);
  };

  if (!policy) return null;

  const policyLabel = policy.number || String(policy.id);

  // Step 1: Confirmation
  const renderStep1 = () => (
    <Box>
      <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.6)', mb: 3 }}>
        Czy na pewno chcesz zarchiwizować polisę?
      </Typography>

      <Box
        sx={{
          border: '1px solid rgba(143, 109, 95, 0.12)',
          borderRadius: '8px',
          p: 2,
          mb: 3
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Nr. polisy</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
              {policy.number || '-'}
            </Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Klient</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
              {policy.client || '-'}
            </Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Status</Typography>
            <Chip
              label={policy.status}
              size="small"
              sx={{
                fontSize: '12px',
                height: 24,
                bgcolor: 'rgba(143, 109, 95, 0.08)',
                color: '#7A5D51'
              }}
            />
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="space-between">
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
            textTransform: 'none'
          }}
        >
          Anuluj
        </Button>
        <Button
          variant="contained"
          onClick={handleContinueToPassword}
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
          Kontynuuj
        </Button>
      </Stack>
    </Box>
  );

  // Step 2: Password confirmation
  const renderStep2 = () => (
    <Box>
      <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.6)', mb: 3 }}>
        Potwierdź archiwizację polisy <strong>{policyLabel}</strong> wpisując hasło:
      </Typography>

      <TextField
        label="Hasło"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordError(null);
        }}
        error={Boolean(passwordError)}
        helperText={passwordError}
        fullWidth
        size="medium"
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                {showPassword ? (
                  <VisibilityRoundedIcon sx={{ fontSize: 20, color: '#9E9E9E' }} />
                ) : (
                  <VisibilityOffRoundedIcon sx={{ fontSize: 20, color: '#9E9E9E' }} />
                )}
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      <Stack direction="row" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={() => setStep(1)}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none'
          }}
        >
          Wróć
        </Button>
        <Button
          variant="contained"
          onClick={handleArchive}
          disabled={loading || !password}
          sx={{
            bgcolor: '#D32F2F',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#B71C1C' }
          }}
        >
          Archiwizuj
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
      PaperProps={{
        sx: { bgcolor: 'white', borderRadius: '16px', overflow: 'hidden', maxWidth: 480 }
      }}
    >
      <DialogContent sx={{ p: 2, pt: 2 }}>
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
            Archiwizuj polisę
          </Typography>
          <IconButton onClick={handleClose} size="medium" aria-label="Zamknij">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>
        {step === 1 ? renderStep1() : renderStep2()}
      </DialogContent>
    </Dialog>
  );
};

export default ArchivePolicyDialog;
