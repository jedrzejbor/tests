import { Box } from '@mui/material';

import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NotFoundContent from '@/components/NotFoundContent';

const UnavailablePage = () => {
  return (
    <Box component="main" pb={4}>
      <ListPlaceholderLayout title="Funkcjonalność jeszcze niedostępna">
        <NotFoundContent />
      </ListPlaceholderLayout>
    </Box>
  );
};

export default UnavailablePage;
