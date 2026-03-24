import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editDocumentSchema, type EditDocumentFormValues } from '@/utils/formSchemas';
import {
  getDocumentDetails,
  updateDocument,
  type DocumentDetailsApiDocument,
  type DocumentAttachment,
  type DocumentRecord
} from '@/services/documentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

export interface EditDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Document record from the list (has id, name, date, etc.) */
  document: DocumentRecord | null;
  onSuccess?: () => void;
}

const EditDocumentDialog: React.FC<EditDocumentDialogProps> = ({
  open,
  onClose,
  document: docRecord,
  onSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { addToast } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [existingAttachment, setExistingAttachment] = useState<DocumentAttachment | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors }
  } = useForm<EditDocumentFormValues>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      name: '',
      description: '',
      date: '',
      keepExistingFile: true,
      newFile: undefined
    }
  });

  const keepExistingFile = watch('keepExistingFile');

  // Fetch full document details when dialog opens
  const loadDetails = useCallback(async () => {
    if (!docRecord?.id) return;
    setDetailsLoading(true);
    try {
      const response = await getDocumentDetails(docRecord.id);
      const doc: DocumentDetailsApiDocument = response.document;
      setValue('name', doc.name || '');
      setValue('description', doc.description || '');
      // Backend returns date as "YYYY-MM-DD HH:mm:ss" — extract just the date part for <input type="date">
      const rawDate = doc.date || '';
      const dateForInput = rawDate.slice(0, 10); // "YYYY-MM-DD"
      setValue('date', dateForInput);
      setValue('newFile', undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (doc.attachments && doc.attachments.length > 0) {
        setExistingAttachment(doc.attachments[0]);
        setValue('keepExistingFile', true);
      } else {
        setExistingAttachment(null);
        setValue('keepExistingFile', false);
      }
    } catch (error) {
      const apiError = error as ApiError;
      addToast({
        id: crypto.randomUUID(),
        message: apiError?.message || 'Nie udało się pobrać szczegółów dokumentu',
        severity: 'error'
      });
    } finally {
      setDetailsLoading(false);
    }
  }, [docRecord?.id, setValue, addToast]);

  useEffect(() => {
    if (open && docRecord) {
      loadDetails();
    }
  }, [open, docRecord, loadDetails]);

  const handleFormSubmit = async (data: EditDocumentFormValues) => {
    if (!docRecord?.id) return;
    setLoading(true);
    try {
      await updateDocument(docRecord.id, {
        name: data.name,
        description: data.description || '',
        date: data.date,
        existingFiles:
          data.keepExistingFile && existingAttachment ? [{ id: existingAttachment.id }] : [],
        newFiles: data.newFile ? [data.newFile] : undefined
      });
      addToast({
        id: crypto.randomUUID(),
        message: 'Dokument został zaktualizowany',
        severity: 'success'
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      const apiError = error as ApiError;

      if (apiError?.status === 422 && apiError.errors) {
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          const formField = field as keyof EditDocumentFormValues;
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
          message: apiError?.message || 'Nie udało się zaktualizować dokumentu',
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset({
      name: '',
      description: '',
      date: '',
      keepExistingFile: true,
      newFile: undefined
    });
    setExistingAttachment(null);
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
      {detailsLoading ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Ładowanie danych dokumentu...
        </Typography>
      ) : (
        <>
          {/* ——— Informacje o dokumencie ——— */}
          <Typography
            sx={{
              fontSize: '14px',
              color: 'rgba(0,0,0,0.6)',
              letterSpacing: '0.17px',
              mb: 2.5
            }}
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
              InputLabelProps={{ shrink: true }}
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
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          {/* ——— Załącznik ——— */}
          <Typography
            sx={{
              fontSize: '14px',
              color: 'rgba(0,0,0,0.6)',
              letterSpacing: '0.17px',
              mb: 2.5
            }}
          >
            Załącznik
          </Typography>

          {/* Existing file */}
          {existingAttachment && keepExistingFile && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                px: 2,
                py: 1.5,
                mb: 2
              }}
            >
              <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
              <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                {existingAttachment.name}
              </Typography>
              <Chip
                label={existingAttachment.size}
                size="small"
                sx={{ bgcolor: '#F3F4F6', fontSize: '12px' }}
              />
              <IconButton
                size="small"
                onClick={() => setValue('keepExistingFile', false)}
                title="Usuń istniejący załącznik"
              >
                <DeleteOutlineIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              </IconButton>
            </Stack>
          )}

          {/* New file picker — show only when existing attachment was removed */}
          {(!existingAttachment || !keepExistingFile) && (
            <Controller
              name="newFile"
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
                    }}
                  />

                  {field.value ? (
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        border: '1px solid #10B981',
                        borderRadius: '8px',
                        px: 2,
                        py: 1.5
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 18, color: '#10B981' }} />
                      <Typography sx={{ fontSize: '14px', color: '#32343A', flex: 1 }}>
                        {field.value.name}
                      </Typography>
                      <Chip
                        label={`${(field.value.size / 1024 / 1024).toFixed(1)} MB`}
                        size="small"
                        sx={{ bgcolor: '#E8F5E9', fontSize: '12px', color: '#2E7D32' }}
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
                        borderColor: '#D0D5DD',
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
                      {existingAttachment && !keepExistingFile
                        ? 'Wybierz nowy plik (zastąpi obecny)'
                        : 'Dodaj nowy plik (max 35 MB)'}
                    </Button>
                  )}

                  {errors.newFile && (
                    <Typography sx={{ fontSize: '12px', color: '#EF4444', mt: 0.5, ml: 1.5 }}>
                      {errors.newFile.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
          )}

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
              startIcon={<SaveOutlinedIcon />}
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
              Zapisz zmiany
            </Button>
          </Stack>
        </>
      )}
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
        Edytuj dokument
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
        sx={{ zIndex: (theme) => theme.zIndex.modal + 200 }}
        PaperProps={{
          sx: {
            bgcolor: '#FFFFFF',
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

export default EditDocumentDialog;
