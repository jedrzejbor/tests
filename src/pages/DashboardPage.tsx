import { Typography, Box } from '@mui/material';
import { useAuthStore } from '@/store/authStore';

const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  // height is handled by the container styles below

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h5"
          sx={{ fontSize: '32px', fontWeight: 300, lineHeight: '44px', color: '#1E1F21' }}
        >
          {`Witaj${user?.name ? ' ' + user.name : ''}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardPage;
