import { Box, Typography } from '@mui/material';

interface ListPlaceholderLayoutProps {
  title: string;
  children: React.ReactNode;
}

const ListPlaceholderLayout = ({ title, children }: ListPlaceholderLayoutProps) => {
  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '600px'
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontSize: '32px',
            fontWeight: 300,
            lineHeight: '44px',
            color: '#1E1F21'
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          pb: 4
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default ListPlaceholderLayout;
