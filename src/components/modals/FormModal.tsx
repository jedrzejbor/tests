import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import React from 'react';

export interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable modal component that renders as:
 * - Desktop: centered Dialog
 * - Mobile: bottom sheet Drawer
 */
const FormModal: React.FC<FormModalProps> = ({ open, onClose, title, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mobile: Drawer from bottom
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 200,
          '& .MuiDrawer-paper': {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90vh',
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ pb: 3, pt: 1 }}>
          {/* Header with close button */}
          <Stack
            direction="row"
            justifyContent="flex-end"
            alignItems="center"
            sx={{ px: 1, pt: 1 }}
          >
            <IconButton onClick={onClose} size="small" aria-label="Zamknij">
              <CloseIcon sx={{ color: '#8E9098' }} />
            </IconButton>
          </Stack>

          {/* Title */}
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 300,
                fontSize: '20px',
                lineHeight: 1.6,
                letterSpacing: '0.15px',
                color: 'rgba(0, 0, 0, 0.87)'
              }}
            >
              {title}
            </Typography>
          </Box>

          {/* Form content */}
          <Box sx={{ px: 2 }}>{children}</Box>
        </Box>
      </Drawer>
    );
  }

  // Desktop: centered Dialog
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: 520
        }
      }}
    >
      <DialogContent sx={{ p: 2, backgroundColor: theme.palette.background.paper }}>
        {/* Header with title and close button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 300,
              fontSize: '20px',
              lineHeight: 1.6,
              letterSpacing: '0.15px',
              color: 'rgba(0, 0, 0, 0.87)'
            }}
          >
            {title}
          </Typography>
          <IconButton onClick={onClose} size="medium" aria-label="Zamknij">
            <CloseIcon sx={{ color: '#8E9098' }} />
          </IconButton>
        </Stack>

        {/* Form content */}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default FormModal;
