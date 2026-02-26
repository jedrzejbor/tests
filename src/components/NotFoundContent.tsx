import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

const NotFoundContent = () => {
  const token = useAuthStore((state) => state.token);

  return (
    <Paper variant="outlined" sx={{ maxWidth: 480, width: '100%', p: 4 }}>
      <Stack spacing={2} textAlign="center" alignItems="center">
        <SearchOffRoundedIcon color="disabled" fontSize="large" />
        <Typography variant="h5" component="h1">
          Nie znaleziono strony
        </Typography>
        <Typography color="text.secondary">
          Sprawdź, czy adres URL jest poprawny lub wróć do głównej sekcji aplikacji.
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to={token ? '/app' : '/login'}
          fullWidth
          sx={{ maxWidth: 240 }}
        >
          Wróć do panelu
        </Button>
      </Stack>
    </Paper>
  );
};

export default NotFoundContent;
