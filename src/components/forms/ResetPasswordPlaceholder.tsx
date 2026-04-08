import passwordLock from '@/assets/password-lock.svg';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { changePassword } from '@/services/authService';
import { useUiStore } from '@/store/uiStore';

// Nowy schema tylko dla nowego hasła (bez kodu - kod jest w URL)
const setNewPasswordSchema = z
  .object({
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirmPassword: z.string().min(1, 'Potwierdź nowe hasło')
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Hasła muszą się zgadzać'
  });

type SetNewPasswordFormValues = z.infer<typeof setNewPasswordSchema>;

interface ResetPasswordPlaceholderProps {
  onBack?: () => void;
  onSuccess?: () => void;
  /** When true, shows "Ustaw hasło dla konta" instead of "Ustaw nowe hasło" */
  isNewAccount?: boolean;
}

export const ResetPasswordPlaceholder: React.FC<ResetPasswordPlaceholderProps> = ({
  onBack,
  onSuccess,
  isNewAccount = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm<SetNewPasswordFormValues>({ resolver: zodResolver(setNewPasswordSchema) });

  const { addToast } = useUiStore();

  const onSubmit = async (data: SetNewPasswordFormValues) => {
    if (!token || !email) {
      addToast({
        id: crypto.randomUUID(),
        message: 'Nieprawidłowy link resetowania hasła. Spróbuj ponownie.',
        severity: 'error'
      });
      return;
    }

    try {
      await changePassword({
        email,
        token,
        password: data.password,
        password_confirmation: data.confirmPassword
      });
      addToast({
        id: crypto.randomUUID(),
        message: 'Hasło zostało zmienione. Możesz się teraz zalogować.',
        severity: 'success'
      });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
    }
  };

  const passwordHelperText =
    'Stwórz długie hasło (min. 8 znaków) z różnorodnymi elementami, takimi jak litery (zarówno wielkie, jak i małe), cyfry i znaki specjalne, unikając informacji osobistych.';

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: isMobile ? 343 : 420,
        mx: 'auto'
      }}
    >
      {/* Back button */}
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{
          position: 'absolute',
          alignSelf: 'flex-start',
          color: '#1E1F21',
          px: 1.5,
          mb: 4,
          mt: -2,
          top: '40px',
          left: '20px'
        }}
      >
        {isMobile ? 'Wróć' : 'Wróć do logowania'}
      </Button>

      <Stack spacing={3} alignItems="center">
        {/* Icon */}
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: 'rgba(143, 109, 95, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            component="img"
            src={passwordLock}
            alt="Lock"
            sx={{ width: 36, height: 36, objectFit: 'contain' }}
          />
        </Box>

        {/* Title & Description */}
        <Stack spacing={1} textAlign="center" sx={{ width: '100%', maxWidth: 311 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 300,
              fontSize: '24px',
              lineHeight: 1.334,
              color: '#32343A'
            }}
          >
            {isNewAccount ? 'Ustaw hasło dla konta' : 'Ustaw nowe hasło'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '14px',
              lineHeight: 1.43,
              letterSpacing: '0.17px',
              color: 'rgba(0, 0, 0, 0.6)'
            }}
          >
            {passwordHelperText}
          </Typography>
        </Stack>

        {/* Form fields */}
        <Stack spacing={2.5} sx={{ width: '100%', mt: 2 }}>
          <TextField
            label="Nowe hasło"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            {...register('password')}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    size="small"
                  >
                    {showNewPassword ? (
                      <VisibilityOffRoundedIcon sx={{ color: '#74767F' }} />
                    ) : (
                      <VisibilityRoundedIcon sx={{ color: '#74767F' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <TextField
            label="Powtórz nowe hasło"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? (
                      <VisibilityOffRoundedIcon sx={{ color: '#74767F' }} />
                    ) : (
                      <VisibilityRoundedIcon sx={{ color: '#74767F' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
            sx={{
              bgcolor: '#1E1F21',
              color: '#FFFFFF',
              py: 1.25,
              fontSize: '14px',
              fontWeight: 500,
              '&:hover': { bgcolor: '#32343A' }
            }}
          >
            Zapisz
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ResetPasswordPlaceholder;
