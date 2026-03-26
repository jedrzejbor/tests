import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

/**
 * Strona pośrednia dla linków z maila nowego konta: /set-password/TOKEN&email=EMAIL
 * Parsuje token i email, następnie przekierowuje do /set-password?token=TOKEN&email=EMAIL
 * Używa tego samego mechanizmu co reset hasła — POST /api/password/reset
 */
export const SetPasswordTokenPage = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Parsuj token i email - backend wysyła w formacie: /set-password/TOKEN&email=EMAIL
    const parts = token.split('&email=');
    const actualToken = parts[0];
    const email = parts[1] || '';

    if (!email) {
      const searchParams = new URLSearchParams(location.search);
      const emailFromQuery = searchParams.get('email');

      if (emailFromQuery) {
        navigate(`/set-password?token=${actualToken}&email=${emailFromQuery}`, { replace: true });
      } else {
        navigate('/login');
      }
    } else {
      navigate(`/set-password?token=${actualToken}&email=${email}`, { replace: true });
    }
  }, [token, location.search, navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default SetPasswordTokenPage;
