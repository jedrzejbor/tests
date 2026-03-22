import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogContent,
  Drawer,
  useMediaQuery,
  useTheme,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDocumentSchema, type AddDocumentFormValues } from '@/utils/formSchemas';
import { createDocument } from '@/services/documentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface AddDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  /** ID klienta do którego przypisany jest dokument */
  clientId: number;
  onSuccess?: () => void;
}

const AddDocumentDialog: React.FC<AddDocumentDialogProps> = ({
  open,
  onClose,
  clientId,
  onSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors }
  } = useForm<AddDocumentFormValues>({
    resolver: zodResolver(addDocumentSchema),
    defaultValues: {
      name: '',
      description: '',
      date: '',
      attachment: undefined
    }
  });

  // Reset form every time the dialog is opened
  useEffect(() => {
    if (open) {
      reset({ name: '', description: '', date: '', attachment: undefined });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: AddDocumentFormValues) => {
    setLoading(true);
    try {
      await createDocument({
        client_id: clientId,
        name: data.name,
        description: data.description || undefined,
        date: data.date,
        attachment: data.attachment
      });
      addToast({
        id: crypto.randomUUID(),
        message: 'Dokument został dodany',
        severity: 'success'
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof AddDocumentFormValues;
          if (formField) {
            setError(formField, {
              type: 'server',
              message: messages?.[0] || 'Nieprawidłowa wartość'
            });
          }
        });
        addToast({
          id: crypto.randomUUID(),
          message: 'Popraw błędy w formularzu',
          severity: 'error'
        });
      } else {
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się dodać dokumentu',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset({ name: '', description: '', date: '', attachment: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const renderFormContent = () => (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      sx={{
        '& .MuiOutlinedInput-root': { borderRadius: '4px' },
        '& .MuiOutlinedInput-notchedOutline': { borderRadius: '4px' }
      }}
    >
      {/* ——— Informacje o dokumencie ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Informacje o dokumencie
      </Typography>

      <Stack spacing={2.5} sx={{ mb: 2.5 }}>
        <TextField
          label="Nazwa dokumentu"
          {...register('name')}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
          fullWidth
          size="medium"
        />

        <TextField
          label="Data dokumentu"
          type="date"
          {...register('date')}
          error={Boolean(errors.date)}
          helperText={errors.date?.message}
          fullWidth
          size="medium"
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Opis (opcjonalnie)"
          {...register('description')}
          error={Boolean(errors.description)}
          helperText={errors.description?.message}
          fullWidth
          size="medium"
          multiline
          rows={3}
        />
      </Stack>

      {/* ——— Załącznik ——— */}
      <Typography
        sx={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)', letterSpacing: '0.17px', mb: 2.5 }}
      >
        Załącznik
      </Typography>

      <Controller
        name="attachment"
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 2.5 }}>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".doc,.docx,.pdf,.xlsx,.xls,.zip,.rar,.7z,.gz,.tar,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) field.onChange(file);
                // Reset input value so the same file can be re-selected
                e.target.value = '';
              }}
            />

            {field.value ? (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  px: 2,
                  py: 1.5
                }}
              >
                <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
                <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                  {field.value.name}
                </Typography>
                <Chip
                  label={`${(field.value.size / 1024 / 1024).toFixed(1)} MB`}
                  size="small"
                  sx={{ bgcolor: '#F3F4F6', fontSize: '12px' }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    field.onChange(undefined);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
                </IconButton>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{
                  borderStyle: 'dashed',
                  borderColor: errors.attachment ? '#EF4444' : '#D0D5DD',
                  color: '#74767F',
                  borderRadius: '8px',
                  py: 2,
                  textTransform: 'none',
                  fontSize: '14px',
                  '&:hover': {
                    borderColor: '#1E1F21',
                    bgcolor: 'rgba(0,0,0,0.02)'
                  }
                }}
              >
                Wybierz plik (max 35 MB)
              </Button>
            )}

            {errors.attachment && (
              <Typography sx={{ fontSize: '12px', color: '#EF4444', mt: 0.5, ml: 1.5 }}>
                {errors.attachment.message}
              </Typography>
            )}
          </Box>
        )}
      />

      {/* ——— Przyciski ——— */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderColor: '#D0D5DD',
            color: '#1E1F21',
            borderRadius: '8px',
            px: 2.75,
            py: 1,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': { borderColor: '#D0D5DD', bgcolor: 'rgba(0,0,0,0.04)' }
          }}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={<AddIcon />}
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
          Dodaj dokument
        </Button>
      </Stack>
    </Box>
  );

  const renderHeader = () => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 3, minHeight: '48px' }}
    >
      <Typography
        sx={{
          fontSize: '20px',
          fontWeight: 300,
          color: 'rgba(0,0,0,0.87)',
          letterSpacing: '0.15px',
          lineHeight: 1.6
        }}
      >
        Dodaj nowy dokument
      </Typography>
      <IconButton onClick={handleClose} size="small" sx={{ color: 'rgba(0,0,0,0.54)' }}>
        <CloseIcon />
      </IconButton>
    </Stack>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '95vh',
            p: 3
          }
        }}
      >
        {renderHeader()}
        {renderFormContent()}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'white', borderRadius: '16px', maxWidth: '600px' }
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {renderHeader()}
        {renderFormContent()}
      </DialogContent>
    </Dialog>
  );
};

export default AddDocumentDialog;
