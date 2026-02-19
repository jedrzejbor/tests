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
import { deleteUser, type UserRecord } from '@/services/usersService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

interface DeleteUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserRecord | null;
  onSuccess?: () => void;
}

interface ExtendedUserData extends UserRecord {
  firstName?: string;
  lastName?: string;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ open, onClose, user, onSuccess }) => {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: show user data, Step 2: ask for password

  const extendedUser = user as ExtendedUserData;

  const handleDelete = async () => {
    setLoading(true);
    setPasswordError(null);
    try {
      console.log('user przed usunięciem:', user);
      if (!user?.id) {
        throw new Error('Brak identyfikatora użytkownika');
      }

      await deleteUser(user.id, password);

      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 400 && apiError.message === 'CANNOT_DELETE_SELF') {
        addToast({
          id: crypto.randomUUID(),
          message: 'Nie możesz usunąć własnego konta',
          severity: 'error'
        });
        return;
      }

      if (apiError?.status === 422) {
        const fieldError = apiError.errors?.password?.[0];
        if (fieldError) {
          setPasswordError(fieldError);
          return;
        }
      }

      const message = apiError?.message || 'Wystąpił błąd podczas usuwania użytkownika';
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

  const step1Content = (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 300,
            color: 'rgba(0, 0, 0, 0.87)',
            letterSpacing: '0.15px',
            lineHeight: 1.6
          }}
        >
          Czy na pewno chcesz usunąć <br />
          użytkownika?
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'rgba(0, 0, 0, 0.54)'
          }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Warning text */}
      <Typography
        sx={{
          fontSize: '14px',
          color: '#74767F',
          letterSpacing: '0.17px',
          lineHeight: 1.43,
          mb: 3
        }}
      >
        Pamiętaj usuwając klienta Centrala, usuniesz również powiązane z nim Jednostki. Przed
        usunięciem upewni się czy nie utracisz innych danych.
      </Typography>

      {/* User details card */}
      <Box
        sx={{
          border: '1px solid rgba(143, 109, 95, 0.12)',
          borderRadius: '8px',
          px: 2,
          mb: 2
        }}
      >
        <Stack spacing={0}>
          {/* Nazwa klienta */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Nazwa klienta
            </Typography>
            <Typography
              sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A', letterSpacing: '0.1px' }}
            >
              {user?.company || '-'}
            </Typography>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(143, 109, 95, 0.08)' }} />

          {/* Imię i nazwisko */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Imię i nazwisko
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
              {extendedUser?.firstName && extendedUser?.lastName
                ? `${extendedUser.firstName} ${extendedUser.lastName}`
                : user?.full_name || '-'}
            </Typography>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(143, 109, 95, 0.08)' }} />

          {/* Email */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Email
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.87)' }}>
              {user?.email || '-'}
            </Typography>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(143, 109, 95, 0.08)' }} />

          {/* Telefon */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Telefon
            </Typography>
            <Typography
              sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A', letterSpacing: '0.1px' }}
            >
              {user?.phone || '-'}
            </Typography>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(143, 109, 95, 0.08)' }} />

          {/* Rodzaj klienta */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5 }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Rodzaj klienta
            </Typography>
            <Chip
              label={user?.account_type || 'Firma'}
              size="small"
              sx={{
                bgcolor: '#E7E8EB',
                color: '#32343A',
                fontSize: '12px',
                height: '18px',
                borderRadius: '16px',
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          </Stack>

          <Divider sx={{ borderColor: 'rgba(143, 109, 95, 0.08)' }} />

          {/* Status */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F', letterSpacing: '0.17px' }}>
              Status
            </Typography>
            <Chip
              label={user?.status === 'aktywny' ? 'Aktywny' : 'Nieaktywny'}
              size="small"
              icon={
                <Box
                  sx={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    bgcolor: user?.status === 'aktywny' ? '#2E7D32' : '#757575',
                    ml: 1
                  }}
                />
              }
              sx={{
                bgcolor: user?.status === 'aktywny' ? '#E8F5E9' : '#F5F5F5',
                color: user?.status === 'aktywny' ? '#2E7D32' : '#757575',
                fontSize: '12px',
                height: '20px',
                borderRadius: '16px',
                '& .MuiChip-label': {
                  px: 0.75,
                  pl: 0.5
                },
                '& .MuiChip-icon': {
                  ml: 1,
                  mr: 0
                }
              }}
            />
          </Stack>
        </Stack>
      </Box>

      {/* CTA Buttons */}
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
            boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
            '&:hover': {
              borderColor: '#D0D5DD',
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
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
            '&:hover': {
              bgcolor: '#32343A'
            }
          }}
        >
          Usuń klienta
        </Button>
      </Stack>
    </Box>
  );

  const step2Content = (
    <Box sx={{ p: 3 }}>
      {/* Header */}
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
            color: 'rgba(0, 0, 0, 0.87)',
            letterSpacing: '0.15px',
            lineHeight: 1.6
          }}
        >
          Potwierdź usunięcie użytkownika
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'rgba(0, 0, 0, 0.54)'
          }}
        >
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Warning text */}
      <Typography
        sx={{
          fontSize: '14px',
          color: '#74767F',
          letterSpacing: '0.17px',
          lineHeight: 1.43,
          mb: 3
        }}
      >
        Podaj hasło używane do logowania do systemu, aby usunąć ubezpieczyciela
      </Typography>

      {/* Password field */}
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
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px'
          }
        }}
      />

      {/* CTA Buttons */}
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
            boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
            '&:hover': {
              borderColor: '#D0D5DD',
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          Anuluj
        </Button>
        <Button
          variant="contained"
          onClick={handleDelete}
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
            '&:hover': {
              bgcolor: '#32343A'
            }
          }}
        >
          Usuń użytkownika
        </Button>
      </Stack>
    </Box>
  );

  // Render appropriate version based on screen size
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'white',
          borderRadius: '16px',
          maxWidth: '600px'
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>{step === 1 ? step1Content : step2Content}</DialogContent>
    </Dialog>
  );
};

export default DeleteUserDialog;
