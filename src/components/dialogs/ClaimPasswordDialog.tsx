import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { archiveClaim, type ClaimRecord } from '@/services/claimsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

type ClaimPasswordDialogMode = 'archive' | 'delete';

interface ClaimPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  claim: ClaimRecord | null;
  mode: ClaimPasswordDialogMode;
  onSuccess?: () => void;
  action?: (claimId: string | number, password: string) => Promise<void>;
}

const modeCopy = {
  archive: {
    title: 'Archiwizuj szkodę',
    intro: 'Czy na pewno chcesz zarchiwizować szkodę?',
    password: 'Potwierdź archiwizację szkody wpisując hasło:',
    button: 'Archiwizuj',
    error: 'Wystąpił błąd podczas archiwizacji szkody',
    success: 'Szkoda została zarchiwizowana'
  },
  delete: {
    title: 'Usuń szkodę',
    intro: 'Czy na pewno chcesz trwale usunąć szkodę? Tej operacji nie można cofnąć.',
    password: 'Potwierdź trwałe usunięcie szkody wpisując hasło:',
    button: 'Usuń trwale',
    error: 'Wystąpił błąd podczas trwałego usuwania szkody',
    success: 'Szkoda została trwale usunięta'
  }
} as const;

const ClaimPasswordDialog: React.FC<ClaimPasswordDialogProps> = ({
  open,
  onClose,
  claim,
  mode,
  onSuccess,
  action
}) => {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const copy = modeCopy[mode];
  const runAction = action ?? archiveClaim;

  const handleClose = () => {
    setPassword('');
    setPasswordError(null);
    setShowPassword(false);
    setStep(1);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setPasswordError(null);

    try {
      if (!claim?.id) {
        throw new Error('Brak identyfikatora szkody');
      }

      await runAction(claim.id, password);
      addToast({ id: crypto.randomUUID(), message: copy.success, severity: 'success' });
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

      addToast({
        id: crypto.randomUUID(),
        message: apiError?.message || copy.error,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!claim) return null;

  const claimLabel = claim.number || String(claim.id);

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
            {copy.title}
          </Typography>
          <IconButton onClick={handleClose} size="medium" aria-label="Zamknij">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>

        {step === 1 ? (
          <Box>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.6)', mb: 3 }}>
              {copy.intro}
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
                  <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Nr szkody</Typography>
                  <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
                    {claim.number || '-'}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Klient</Typography>
                  <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
                    {claim.client_name || '-'}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            <Stack direction="row" justifyContent="space-between">
              <Button variant="outlined" onClick={handleClose} sx={{ textTransform: 'none' }}>
                Anuluj
              </Button>
              <Button
                variant="contained"
                onClick={() => setStep(2)}
                sx={{
                  bgcolor: '#1E1F21',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#32343A' }
                }}
              >
                Kontynuuj
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.6)', mb: 3 }}>
              {copy.password} <strong>{claimLabel}</strong>
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
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((value) => !value)}
                      edge="end"
                      size="small"
                    >
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
              <Button variant="outlined" onClick={() => setStep(1)} sx={{ textTransform: 'none' }}>
                Wróć
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !password}
                sx={{
                  bgcolor: '#D32F2F',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#B71C1C' }
                }}
              >
                {copy.button}
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClaimPasswordDialog;
