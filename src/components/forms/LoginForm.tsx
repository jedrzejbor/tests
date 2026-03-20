import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/utils/formSchemas';
import { login } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onBecomeClient?: () => void;
  onLinkClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onBecomeClient,
  onLinkClick
}) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    setError: setFormError
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const { setLoading, loading, clearError, setPendingAuth } = useAuthStore();
  const { addToast } = useUiStore();

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    clearError();
    try {
      // Wywołaj endpoint logowania
      await login({ email: data.email, password: data.password });

      // Zapisz dane do użycia w kroku 2FA
      setPendingAuth({ email: data.email, password: data.password });

      addToast({
        id: crypto.randomUUID(),
        message: 'Kod autoryzacyjny został wysłany',
        severity: 'success'
      });

      // Przekieruj do strony 2FA
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      // Wyświetl błąd pod polem hasła (tak samo jak błędy walidacji)
      setFormError('password', { type: 'manual', message });
      // Podświetl również pole email
      setFormError('email', { type: 'manual', message: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column">
      <Stack
        spacing={1}
        mb={3}
        sx={{
          borderBottom: 1,
          borderColor: 'secondary.main',
          pt: 2,
          pb: 2
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontSize: '24px', fontWeight: 300 }}>
          Witaj!
        </Typography>
        <Typography
          variant="body1"
          sx={{ fontSize: '14px', fontWeight: 400 }}
          color="text.secondary"
        >
          Zaloguj się do platformy i bądź na bieżąco z wszystkimi informacjami.
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={Boolean(errors.email || errors.password)}
          helperText={errors.email?.message}
          {...register('email')}
        />

        <TextField
          label="Hasło"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={Boolean(errors.email || errors.password)}
          helperText={errors.password?.message}
          {...register('password')}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                  {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        <Box display="flex" justifyContent="flex-end">
          <Link
            component="button"
            type="button"
            onClick={onForgotPassword}
            sx={{
              color: 'secondary.main',
              mt: '-4px',
              mb: '20px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Nie pamiętam hasła
          </Link>
        </Box>
      </Stack>

      <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ height: 40, py: '8px', px: '22px', fontSize: '14px' }}
        >
          Zaloguj się
        </Button>

        <Button
          variant="outlined"
          onClick={onBecomeClient}
          fullWidth
          sx={{ height: 40, py: '8px', px: '19px', fontSize: '14px' }}
        >
          Chcę zostać klientem Cliffside Brokers
        </Button>
      </Stack>

      <Box
        sx={{
          borderTop: 1,
          borderColor: 'secondary.main',
          pt: 2,
          pb: 2,
          mt: 4
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
          <Link
            component="button"
            type="button"
            onClick={onLinkClick}
            underline="always"
            sx={{
              color: '#8F6D5F',
              fontSize: '14px',
              fontWeight: 400,
              '&:hover': { color: '#8F6D5F' }
            }}
          >
            Regulaminy
          </Link>
          <Link
            component="button"
            type="button"
            onClick={onLinkClick}
            underline="always"
            sx={{
              color: '#8F6D5F',
              fontSize: '14px',
              fontWeight: 400,
              '&:hover': { color: '#8F6D5F' }
            }}
          >
            Polityka prywatności
          </Link>
        </Stack>
      </Box>
    </Box>
  );
};

export default LoginForm;
