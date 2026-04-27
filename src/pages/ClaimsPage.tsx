import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import {
  Box,
  Button,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

const claimColumns = [
  'Klient',
  'Ubezpieczyciel',
  'Numer polisy',
  'Data zgłoszenia',
  'Data szkody',
  'Nr. szkody',
  'Rodzaj szkody',
  'Miejsce zdarzenia'
];

const ClaimsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0
        }}
      >
        <Box sx={{ p: 3, pb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              sx={{
                fontSize: '32px',
                fontWeight: 300,
                lineHeight: '44px',
                color: '#1E1F21'
              }}
            >
              Lista szkód
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/damages/new')}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                px: 2.5,
                bgcolor: '#1E1F21',
                '&:hover': { bgcolor: '#32343A' }
              }}
            >
              Zgłoś szkodę
            </Button>
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={2}
          >
            <TextField
              placeholder="Szukaj"
              size="small"
              disabled
              sx={{
                width: { xs: '100%', md: 300 },
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '& fieldset': {
                    borderColor: '#E5E7EB'
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8E9098', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
            />

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={1.5}>
              <Button
                startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                variant="outlined"
                disabled
                sx={{
                  color: '#32343A',
                  textTransform: 'none',
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 2,
                  bgcolor: 'white'
                }}
              >
                Filtruj
              </Button>
              <Button
                startIcon={<SortIcon sx={{ fontSize: 18 }} />}
                variant="outlined"
                disabled
                sx={{
                  color: '#32343A',
                  textTransform: 'none',
                  borderColor: '#E5E7EB',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 2,
                  bgcolor: 'white'
                }}
              >
                Sortuj
              </Button>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ bgcolor: 'transparent', flex: 1, overflow: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: '#FFFFFF',
                  height: 48,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                {claimColumns.map((column) => (
                  <TableCell
                    key={column}
                    sx={{
                      fontWeight: 500,
                      fontSize: '12px',
                      fontFamily: 'Inter, Roboto, system-ui, -apple-system, "Segoe UI", sans-serif',
                      lineHeight: '18px',
                      color: '#74767F',
                      py: 1.5,
                      px: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                      height: 48,
                      bgcolor: '#FFFFFF',
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={claimColumns.length}
                  sx={{
                    py: 10,
                    borderBottom: 'none',
                    fontSize: '14px',
                    color: '#32343A'
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 500 }}>
                      Brak szkód do wyświetlenia
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                      Widok listy szkód jest gotowy. Dane i akcje dodamy w kolejnym kroku.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default ClaimsPage;
