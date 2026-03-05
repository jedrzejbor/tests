import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editAccountDataSchema, type EditAccountDataFormValues } from '@/utils/formSchemas';

export interface EditAccountDataFormProps {
  initialValues?: EditAccountDataFormValues;
  onSubmit: (data: EditAccountDataFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
  /** Per-field disabled state based on permissions */
  disabledFields?: {
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    phone?: boolean;
  };
}

const EditAccountDataForm: React.FC<EditAccountDataFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  disabledFields = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<EditAccountDataFormValues>({
    resolver: zodResolver(editAccountDataSchema),
    defaultValues: initialValues || {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }
  });

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {/* Section label */}
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(0, 0, 0, 0.6)',
          fontSize: '14px',
          lineHeight: 1.43,
          letterSpacing: '0.17px',
          mb: 2.5
        }}
      >
        Dane konta
      </Typography>

      {/* Form fields */}
      {isMobile ? (
        // Mobile: vertical layout
        <Stack spacing={2.5}>
          <TextField
            label="Imię*"
            {...register('firstName')}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName?.message}
            fullWidth
            size="medium"
            disabled={disabledFields.firstName}
          />
          <TextField
            label="Email*"
            type="email"
            {...register('email')}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            fullWidth
            size="medium"
            disabled={disabledFields.email}
          />
          <TextField
            label="Nazwisko*"
            {...register('lastName')}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName?.message}
            fullWidth
            size="medium"
            disabled={disabledFields.lastName}
          />
          <TextField
            label="Telefon*"
            {...register('phone')}
            error={Boolean(errors.phone)}
            helperText={errors.phone?.message}
            fullWidth
            size="medium"
            disabled={disabledFields.phone}
          />
        </Stack>
      ) : (
        // Desktop: two-column layout
        <Stack direction="row" spacing={2}>
          {/* Left column */}
          <Stack spacing={2.5} sx={{ flex: 1 }}>
            <TextField
              label="Imię*"
              {...register('firstName')}
              error={Boolean(errors.firstName)}
              helperText={errors.firstName?.message}
              fullWidth
              size="medium"
              disabled={disabledFields.firstName}
            />
            <TextField
              label="Email*"
              type="email"
              {...register('email')}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              fullWidth
              size="medium"
              disabled={disabledFields.email}
            />
          </Stack>

          {/* Right column */}
          <Stack spacing={2.5} sx={{ flex: 1 }}>
            {/* <Box sx={{ height: '20px' }} /> Spacer to align with section label */}
            <TextField
              label="Nazwisko*"
              {...register('lastName')}
              error={Boolean(errors.lastName)}
              helperText={errors.lastName?.message}
              fullWidth
              size="medium"
              disabled={disabledFields.lastName}
            />
            <TextField
              label="Telefon*"
              {...register('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
              fullWidth
              size="medium"
              disabled={disabledFields.phone}
            />
          </Stack>
        </Stack>
      )}

      {/* Action buttons */}
      <Stack
        direction="row"
        justifyContent={isMobile ? 'center' : 'space-between'}
        alignItems="center"
        sx={{ mt: 3 }}
      >
        {isMobile ? (
          // Mobile: full-width submit button
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              bgcolor: '#1E1F21',
              color: '#FFFFFF',
              borderRadius: 1,
              py: 1,
              fontSize: '14px',
              fontWeight: 500,
              '&:hover': { bgcolor: '#32343A' }
            }}
          >
            Zapisz zmiany
          </Button>
        ) : (
          // Desktop: Cancel and Submit buttons
          <>
            <Button
              variant="outlined"
              onClick={onCancel}
              endIcon={<CloseIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: '#D0D5DD',
                color: '#1E1F21',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0, 0, 0, 0.04)' }
              }}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#1E1F21',
                color: '#FFFFFF',
                borderRadius: 1,
                px: 3,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': { bgcolor: '#32343A' }
              }}
            >
              Zapisz zmiany
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default EditAccountDataForm;
