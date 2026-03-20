import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';

interface UnavailableFeatureModalProps {
  open: boolean;
  onClose: () => void;
}

const UnavailableFeatureModal: React.FC<UnavailableFeatureModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const content = (
    <Stack spacing={3} alignItems="center" sx={{ py: 2, px: 1, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'rgba(143, 109, 95, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 32, color: '#8F6D5F' }} />
      </Box>

      <Box>
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 500,
            color: '#1E1F21',
            lineHeight: 1.4,
            mb: 1
          }}
        >
          Funkcjonalność jeszcze niedostępna
        </Typography>
        <Typography
          sx={{
            fontSize: '14px',
            color: '#74767F',
            lineHeight: 1.57,
            letterSpacing: '0.17px'
          }}
        >
          Ta funkcjonalność jest aktualnie w trakcie przygotowania
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={onClose}
        fullWidth
        sx={{
          bgcolor: '#1E1F21',
          color: '#FFFFFF',
          borderRadius: '8px',
          py: 1,
          fontSize: '14px',
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': { bgcolor: '#32343A' }
        }}
      >
        Rozumiem
      </Button>
    </Stack>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{
          zIndex: (t) => t.zIndex.modal + 100,
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
            backgroundColor: (t) => t.palette.background.paper,
            borderTop: '1px solid rgba(143, 109, 95, 0.12)'
          }
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 3 }}>
          <Stack direction="row" justifyContent="flex-end">
            <IconButton onClick={onClose} size="small">
              <CloseIcon sx={{ color: '#8E9098' }} />
            </IconButton>
          </Stack>
          {content}
        </Box>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: 400,
          backgroundColor: (t) => t.palette.background.paper,
          border: '1px solid rgba(143, 109, 95, 0.12)'
        }
      }}
    >
      <DialogContent sx={{ p: 3, backgroundColor: (t) => t.palette.background.paper }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default UnavailableFeatureModal;
