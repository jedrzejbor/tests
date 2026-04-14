import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  IconButton,
  Divider,
  Dialog,
  DialogContent,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PaymentRecord } from '@/services/paymentsService';

interface ViewPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
}

const InfoRow: React.FC<{ label: string; value: string | number | null | undefined }> = ({
  label,
  value
}) => (
  <>
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
    >
      <Typography sx={{ fontSize: '14px', color: '#74767F' }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#32343A',
          textAlign: 'right',
          maxWidth: '60%',
          wordBreak: 'break-word'
        }}
      >
        {value || '-'}
      </Typography>
    </Stack>
    <Divider sx={{ borderColor: 'rgba(143,109,95,0.08)' }} />
  </>
);

const ViewPaymentDialog: React.FC<ViewPaymentDialogProps> = ({ open, onClose, payment }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  const content = (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 300,
            color: 'rgba(0,0,0,0.87)',
            letterSpacing: '0.15px',
            lineHeight: 1.6
          }}
        >
          Szczegóły płatności składki
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Details card */}
      <Box
        sx={{
          border: '1px solid rgba(143,109,95,0.12)',
          borderRadius: '8px',
          px: 2,
          mb: 3,
          overflow: 'hidden'
        }}
      >
        <Stack spacing={0}>
          <InfoRow label="Ubezpieczyciel" value={payment?.insurance_company_name} />
          <InfoRow label="Numer polisy" value={payment?.policy_number} />
          <InfoRow label="Data przelewu" value={formatDate(payment?.payment_date)} />
          <InfoRow label="Kwota raty" value={payment?.payment_total} />
          <InfoRow label="Prowizja" value={payment?.margin} />
          <InfoRow
            label="Procent prowizji"
            value={payment?.margin_percent ? `${payment.margin_percent}%` : undefined}
          />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ py: 1.5, px: 1.5, minHeight: '40px' }}
          >
            <Typography sx={{ fontSize: '14px', color: '#74767F' }}>Status</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#32343A' }}>
              {payment?.status || '-'}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Footer */}
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: '#1E1F21',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { bgcolor: '#32343A' }
          }}
        >
          Zamknij
        </Button>
      </Stack>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 200 }}
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '95vh',
            overflowY: 'auto'
          }
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'white', borderRadius: '16px', maxWidth: '520px' }
      }}
    >
      <DialogContent sx={{ p: 0 }}>{content}</DialogContent>
    </Dialog>
  );
};

export default ViewPaymentDialog;
