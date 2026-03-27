import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Button, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const NoAccessContent = () => {
  return (
    <Paper variant="outlined" sx={{ maxWidth: 480, width: '100%', p: 4 }}>
      <Stack spacing={2} textAlign="center" alignItems="center">
        <LockOutlinedIcon color="disabled" fontSize="large" />
        <Typography variant="h5" component="h1">
          Brak dostępu
        </Typography>
        <Typography color="text.secondary">
          Nie masz uprawnień do wyświetlenia tej strony. Skontaktuj się z administratorem, aby
          uzyskać dostęp.
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/app/dashboard"
          fullWidth
          sx={{ maxWidth: 240 }}
        >
          Wróć do panelu
        </Button>
      </Stack>
    </Paper>
  );
};

export default NoAccessContent;
