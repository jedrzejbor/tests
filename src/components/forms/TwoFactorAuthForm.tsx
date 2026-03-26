import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import userSvg from '@/assets/user.svg';
import { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { verifyTwoFactor, getMe } from '@/services/authService';

export interface TwoFactorAuthFormProps {
  email?: string;
  onSuccess?: () => void;
  onResend?: () => void;
}

export const TwoFactorAuthForm: React.FC<TwoFactorAuthFormProps> = ({
  email: propEmail,
  onSuccess,
  onResend
}) => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const theme = useTheme();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { pendingAuth, clearPendingAuth, setToken, setUser, token } = useAuthStore();

  // Użyj emaila z pendingAuth lub z props
  const email = propEmail || pendingAuth?.email || 'brak danych';

  // Jeśli użytkownik jest już zalogowany, przekieruj do aplikacji
  useEffect(() => {
    if (token) {
      navigate('/app', { replace: true });
    }
  }, [token, navigate]);

  const handleChange = (index: number, value: string) => {
    // Allow only digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];

    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });

    setCode(newCode);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      addToast({
        id: crypto.randomUUID(),
        message: 'Wprowadź pełny 6-cyfrowy kod',
        severity: 'warning'
      });
      return;
    }

    if (!pendingAuth) {
      addToast({
        id: crypto.randomUUID(),
        message: 'Brak danych logowania. Zaloguj się ponownie.',
        severity: 'error'
      });
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);

    try {
      // Wywołaj endpoint 2FA z pełnymi danymi
      const response = await verifyTwoFactor({
        email: pendingAuth.email,
        password: pendingAuth.password,
        token: fullCode
      });

      // Wyczyść dane tymczasowe PRZED zapisaniem tokenu
      clearPendingAuth();

      // Zapisz token — wymagany przez apiClient do kolejnych requestów
      setToken(response.token);
      // Zapisz podstawowe dane z odpowiedzi 2FA
      setUser(response.user);

      // Pobierz pełne dane użytkownika z /me (zawiera permissions)
      // i nadpisz store — dzięki temu uprawnienia są dostępne od razu
      try {
        const fullUser = await getMe();
        setUser({ ...response.user, ...fullUser });
      } catch {
        // Nieudane /me nie blokuje logowania — permissions załadują się przy wejściu na Ustawienia
      }

      addToast({
        id: crypto.randomUUID(),
        message: 'Zalogowano pomyślnie',
        severity: 'success'
      });

      // Bezpośrednia nawigacja jako backup
      navigate('/app', { replace: true });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingAuth) {
      addToast({
        id: crypto.randomUUID(),
        message: 'Brak danych logowania. Zaloguj się ponownie.',
        severity: 'error'
      });
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    try {
      // Ponownie wywołaj endpoint logowania aby wysłać nowy kod
      const { resendTwoFactor } = await import('@/services/authService');
      // Wywołujemy resend z flagą reset=true po stronie backendu
      await resendTwoFactor({ email: pendingAuth.email, password: pendingAuth.password });

      addToast({
        id: crypto.randomUUID(),
        message: 'Kod wysłany ponownie',
        severity: 'success'
      });
      onResend?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się wysłać kodu';
      addToast({
        id: crypto.randomUUID(),
        message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column">
      <Stack spacing={3} alignItems="center" mb={1}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            component="img"
            src={userSvg}
            alt="User"
            sx={{ width: 40, height: 40, objectFit: 'contain' }}
          />
        </Box>

        <Stack spacing={1} alignItems="center">
          <Typography variant="h6" component="h1" textAlign="center">
            Potwierdź swoją tożsamość
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontSize: '14px', fontWeight: 400 }}
            color="text.secondary"
            textAlign="center"
          >
            W celach bezpieczeństwa wprowadziliśmy logowanie dwuetapowe
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: '#8F6D5F', borderTopWidth: '1px', mb: 1 }} />

      <Typography
        variant="body2"
        color="text.secondary"
        textAlign="center"
        mb={4}
        sx={{ fontSize: '14px' }}
      >
        Wprowadź kod wysłany na
        <br />
        <Box component="span" sx={{ fontWeight: 600 }}>
          {email}
        </Box>
      </Typography>

      <Stack direction="row" spacing={1.5} justifyContent="center" mb={4}>
        {code.map((digit, index) => (
          <TextField
            key={index}
            inputRef={(el) => (inputRefs.current[index] = el)}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            inputProps={{
              maxLength: 1,
              style: {
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 500,
                padding: '0',
                height: 64,
                width: 56
              }
            }}
            sx={{
              height: 64,
              width: 56,
              '& .MuiOutlinedInput-root': {
                borderRadius: '4px'
              }
            }}
          />
        ))}
      </Stack>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={loading || code.join('').length !== 6}
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ height: 40, py: '8px', px: '22px', mb: 2 }}
      >
        Potwierdź
      </Button>

      <Typography variant="body2" color="#74767f" textAlign="justify" sx={{ mb: 2 }}>
        Otrzymanie kodu może zająć chwilę. Jeżeli kod nie dotarł spróbuj wysłać go ponownie
      </Typography>

      <Button
        variant="outlined"
        fullWidth
        onClick={handleResend}
        disabled={loading}
        sx={{ height: 40, py: '8px', px: '22px' }}
      >
        Wyślij ponownie
      </Button>

      {/* <Divider
        sx={{
          borderColor: '#8F6D5F',
          borderTopWidth: '1px',
          mt: 4,
          mb: 1
        }}
      />

      <Stack direction="row" spacing={1.5} justifyContent="center" mt={0} color="text.secondary">
        <Link href="#" underline="hover" color="text.secondary" variant="body2">
          Regulaminy
        </Link>
        <Typography variant="body2" component="span">
          |
        </Typography>
        <Link href="#" underline="hover" color="text.secondary" variant="body2">
          Polityka prywatności
        </Link>
      </Stack> */}

      {/* <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="center"
        mt={2}
        sx={{
          p: 1.5,
          borderRadius: '8px',
          bgcolor: alpha(theme.palette.info.main, 0.08)
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'info.main' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
          Potrzebujesz pomocy? Skontaktuj się z zespołem Cliffsidebrokers
        </Typography>
      </Stack> */}
    </Box>
  );
};

export default TwoFactorAuthForm;
