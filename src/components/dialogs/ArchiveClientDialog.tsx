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
import { archiveClient, type ClientRecord } from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

interface ArchiveClientDialogProps {
  open: boolean;
  onClose: () => void;
  client: ClientRecord | null;
  onSuccess?: () => void;
}

const ArchiveClientDialog: React.FC<ArchiveClientDialogProps> = ({
  open,
  onClose,
  client,
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
      if (!client?.id) {
        throw new Error('Brak identyfikatora klienta');
      }

      await archiveClient(client.id, password);
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

      const message = apiError?.message || 'Wystąpił błąd podczas archiwizacji klienta';
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

  const statusLabel =
    client?.status?.toLowerCase().includes('aktywny') || client?.status?.toLowerCase() === 'active'
      ? 'Aktywny'
      : 'Nieaktywny';
  const isActive = statusLabel === 'Aktywny';

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
          Czy na pewno chcesz zarchiwizować
          <br />
          klienta?
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
        Pamiętaj archiwizując klienta, zarchiwizujesz również powiązane z nim jednostki zależne.
        Przed archiwizacją upewnij się, że nie utracisz innych danych.
      </Typography>

      {/* Client details card */}
      <Box sx={{ border: '1px solid rgba(143,109,95,0.12)', borderRadius: '8px', px: 2, mb: 2 }}>
        <Stack spacing={0}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Nazwa klienta</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A' }}>
              {client?.name || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Typ</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {client?.type || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>NIP</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {client?.nip || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Miasto</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {client?.city || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Status</Typography>
            <Chip
              label={statusLabel}
              size="small"
              icon={
                <Box
                  sx={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    bgcolor: isActive ? '#2E7D32' : '#757575',
                    ml: 1
                  }}
                />
              }
              sx={{
                bgcolor: isActive ? '#E8F5E9' : '#F5F5F5',
                color: isActive ? '#2E7D32' : '#757575',
                fontSize: '12px',
                height: '20px',
                borderRadius: '16px',
                '& .MuiChip-label': { px: 0.75, pl: 0.5 },
                '& .MuiChip-icon': { ml: 1, mr: 0 }
              }}
            />
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
          Archiwizuj klienta
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
          Potwierdź archiwizację klienta
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
        Podaj hasło używane do logowania do systemu, aby zarchiwizować klienta
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
          onClick={handleArchive}
          disabled={loading || !password.trim()}
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
          Archiwizuj klienta
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

export default ArchiveClientDialog;
