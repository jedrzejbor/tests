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
import { forceDeleteDocument, type DocumentRecord } from '@/services/documentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

interface ForceDeleteDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onSuccess?: () => void;
}

const ForceDeleteDocumentDialog: React.FC<ForceDeleteDocumentDialogProps> = ({
  open,
  onClose,
  document: doc,
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
      if (!doc?.id) throw new Error('Brak identyfikatora dokumentu');

      await forceDeleteDocument(doc.id, password);
      addToast({
        id: crypto.randomUUID(),
        message: 'Dokument został trwale usunięty',
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

      const message = apiError?.message || 'Wystąpił błąd podczas usuwania dokumentu';
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
          dokument?
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
        Uwaga! Tej operacji nie można cofnąć. Dokument i jego załączniki zostaną trwale usunięte.
      </Typography>

      {/* Document details card */}
      <Box sx={{ border: '1px solid rgba(143,109,95,0.12)', borderRadius: '8px', px: 2, mb: 2 }}>
        <Stack spacing={0}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Rodzaj dokumentu</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A' }}>
              {doc?.name || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Data</Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.87)' }}>
              {doc?.date
                ? (() => {
                    const d = String(doc.date).slice(0, 10);
                    const [y, m, day] = d.split('-');
                    return `${day}.${m}.${y}`;
                  })()
                : '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', flexShrink: 0, mr: 2 }}>
              Opis
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: 'rgba(0,0,0,0.87)',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '280px'
              }}
            >
              {doc?.description || '-'}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', flexShrink: 0, mr: 2 }}>
              Załącznik
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: 'rgba(0,0,0,0.87)',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '280px'
              }}
            >
              {Array.isArray(doc?.attachments) && doc.attachments.length > 0
                ? doc.attachments.map((a) => a.name).join(', ')
                : '-'}
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
          Potwierdź trwałe usunięcie dokumentu
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
        Podaj hasło używane do logowania do systemu, aby trwale usunąć dokument
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

export default ForceDeleteDocumentDialog;
