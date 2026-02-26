import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { leaveImpersonation } from '@/services/impersonationService';
import { getMe } from '@/services/authService';

/**
 * Banner wyświetlany na górze aplikacji gdy admin jest w trybie impersonacji.
 * Pokazuje kogo impersonuje i przycisk "Zakończ impersonację".
 */
const ImpersonationBanner: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const impersonator = useAuthStore((state) => state.impersonator);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const setImpersonator = useAuthStore((state) => state.setImpersonator);
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);

  // Nie renderuj jeśli nie ma impersonatora
  if (!impersonator) return null;

  const handleLeave = async () => {
    setLoading(true);
    try {
      const response = await leaveImpersonation();

      // Przywróć oryginalny token
      setToken(response.token);
      // Wyczyść impersonatora
      setImpersonator(null);

      // Pobierz dane oryginalnego użytkownika (admina)
      const meUser = await getMe();
      setUser(meUser);

      addToast({
        id: crypto.randomUUID(),
        message: 'Zakończono impersonację',
        severity: 'success'
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nie udało się zakończyć impersonacji';
      addToast({ id: crypto.randomUUID(), message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar + 10,
        bgcolor: '#D32F2F',
        color: '#fff',
        px: 2,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
      }}
    >
      <PersonOffIcon sx={{ fontSize: 20 }} />
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '13px' }}>
        Jesteś zalogowany jako{' '}
        <strong>
          {user?.firstname} {user?.lastname}
        </strong>{' '}
        (impersonacja przez {impersonator.firstname} {impersonator.lastname})
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={handleLeave}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        sx={{
          color: '#fff',
          borderColor: 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          textTransform: 'none',
          py: 0.25,
          px: 1.5,
          '&:hover': {
            borderColor: '#fff',
            bgcolor: 'rgba(255,255,255,0.15)'
          }
        }}
      >
        Zakończ impersonację
      </Button>
    </Box>
  );
};

export default ImpersonationBanner;
