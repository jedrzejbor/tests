import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { fetchClaimFormDefinition, submitClaim } from '@/services/claimsService';
import type { ClaimFormField } from '@/services/claimsService';
import { fetchPoliciesTable } from '@/services/policiesService';
import type { PolicyRecord } from '@/services/policiesService';

// ================== SHARED STYLES ==================

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: '#FFFFFF',
    '& fieldset': { borderColor: '#E5E7EB' },
    '&:hover fieldset': { borderColor: '#C0C2C9' }
  }
} as const;

// ================== SECTION CARD ==================

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <Card
    elevation={0}
    sx={{
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      bgcolor: '#FAFAFA'
    }}
  >
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Typography
        sx={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#74767F',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: 2.5
        }}
      >
        {title}
      </Typography>
      <Stack spacing={2.5}>{children}</Stack>
    </CardContent>
  </Card>
);

// ================== POLICY AUTOCOMPLETE ==================

interface PolicyOption {
  id: number;
  label: string;
  clientName: string;
  policyNumber: string;
}

interface PolicyAutocompleteProps {
  value: PolicyOption | null;
  onChange: (option: PolicyOption | null) => void;
  error?: string;
}

const PolicyAutocomplete: React.FC<PolicyAutocompleteProps> = ({ value, onChange, error }) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<PolicyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPolicies = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const result = await fetchPoliciesTable({
        page: 1,
        perPage: 20,
        search,
        sortProperty: '',
        sortOrder: 'asc',
        filters: {}
      });
      const rows = result.data as PolicyRecord[];
      setOptions(
        rows
          .filter((r) => r.id !== undefined && r.id !== null)
          .map((r) => ({
            id: Number(r.id),
            label: r.number ?? `Polisa #${r.id}`,
            clientName: r.client ?? '',
            policyNumber: r.number ?? ''
          }))
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPolicies(inputValue), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, searchPolicies]);

  return (
    <Autocomplete
      fullWidth
      options={options}
      loading={loading}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      onInputChange={(_e, newInput) => setInputValue(newInput)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      noOptionsText={inputValue.length > 0 ? 'Brak wyników' : 'Wpisz numer polisy…'}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Wybierz polisę do zgłoszenia szkody"
          error={!!error}
          helperText={error}
          sx={inputSx}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
};

// ================== DYNAMIC FIELD ==================

interface DynamicFieldProps {
  field: ClaimFormField;
  control: ReturnType<typeof useForm>['control'];
}

const DynamicField: React.FC<DynamicFieldProps> = ({ field, control }) => {
  const requiredRule = field.required ? { required: `Pole "${field.label}" jest wymagane` } : {};

  switch (field.type) {
    case 'text':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue=""
          rules={requiredRule}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              label={field.label}
              fullWidth
              multiline
              minRows={3}
              placeholder="Wpisz"
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={inputSx}
            />
          )}
        />
      );

    case 'number':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue=""
          rules={{
            ...requiredRule,
            validate: (v) => v === '' || !isNaN(Number(v)) || 'Wartość musi być liczbą'
          }}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              label={field.label}
              type="number"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={inputSx}
            />
          )}
        />
      );

    case 'bool':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={false}
          rules={
            field.required
              ? { validate: (v) => v === true || `Pole "${field.label}" jest wymagane` }
              : {}
          }
          render={({ field: f, fieldState }) => (
            <FormControl error={!!fieldState.error}>
              <FormControlLabel
                control={<Checkbox {...f} checked={!!f.value} />}
                label={field.label}
              />
              {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      );

    case 'date':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue=""
          rules={requiredRule}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              label={field.label}
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={inputSx}
            />
          )}
        />
      );

    case 'datetime':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue=""
          rules={requiredRule}
          render={({ field: f, fieldState }) => (
            <TextField
              {...f}
              label={field.label}
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              sx={inputSx}
            />
          )}
        />
      );

    case 'select-single':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue=""
          rules={requiredRule}
          render={({ field: f, fieldState }) => (
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>{field.label}</InputLabel>
              <Select
                {...f}
                label={field.label}
                sx={{
                  borderRadius: '8px',
                  bgcolor: '#FFFFFF',
                  '& fieldset': { borderColor: '#E5E7EB' }
                }}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      );

    case 'select-multi':
      return (
        <Controller
          name={field.key}
          control={control}
          defaultValue={[]}
          rules={{
            ...requiredRule,
            validate: field.required
              ? (v: number[]) =>
                  (Array.isArray(v) && v.length > 0) || `Pole "${field.label}" jest wymagane`
              : undefined
          }}
          render={({ field: f, fieldState }) => (
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>{field.label}</InputLabel>
              <Select
                {...f}
                multiple
                label={field.label}
                input={
                  <OutlinedInput
                    label={field.label}
                    sx={{ borderRadius: '8px', bgcolor: '#FFFFFF' }}
                  />
                }
                renderValue={(selected: number[]) =>
                  selected
                    .map((id) => field.options?.find((o) => o.id === id)?.label ?? id)
                    .join(', ')
                }
                sx={{ borderRadius: '8px', bgcolor: '#FFFFFF' }}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    <Checkbox checked={((f.value as number[]) ?? []).includes(opt.id)} />
                    <ListItemText primary={opt.label} />
                  </MenuItem>
                ))}
              </Select>
              {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
            </FormControl>
          )}
        />
      );

    default:
      return null;
  }
};

// ================== STATIC FIELD KEYS ==================
// These are always present regardless of the policy type
export const STATIC_FIELD_KEYS = {
  eventDate: '__event_date',
  placeOfAccident: '__place_of_accident',
  circumstances: '__circumstances'
} as const;

// ================== PAGE ==================

const ReportClaimPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPolicyId = searchParams.get('policyId');

  const [policyOption, setPolicyOption] = useState<PolicyOption | null>(null);
  const [policyError, setPolicyError] = useState<string | undefined>(undefined);

  const [fields, setFields] = useState<ClaimFormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm({ mode: 'onBlur', reValidateMode: 'onChange' });

  // Pre-load policy if arriving with ?policyId in URL
  useEffect(() => {
    if (!rawPolicyId) return;

    fetchPoliciesTable({
      page: 1,
      perPage: 1,
      search: '',
      sortProperty: '',
      sortOrder: 'asc',
      filters: { id: rawPolicyId }
    })
      .then((res) => {
        const rows = res.data as PolicyRecord[];
        if (rows.length > 0) {
          const r = rows[0];
          setPolicyOption({
            id: Number(r.id),
            label: r.number ?? `Polisa #${r.id}`,
            clientName: r.client ?? '',
            policyNumber: r.number ?? ''
          });
        }
      })
      .catch(() => undefined);
  }, []);

  // Fetch dynamic form definition whenever policy changes
  useEffect(() => {
    if (policyOption === null) {
      setFields([]);
      return;
    }

    let cancelled = false;
    setLoadingFields(true);
    setFields([]);

    fetchClaimFormDefinition(policyOption.id)
      .then((res) => {
        if (!cancelled) setFields(res.fields);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingFields(false);
      });

    return () => {
      cancelled = true;
    };
  }, [policyOption]);

  const handlePolicyChange = (opt: PolicyOption | null) => {
    setPolicyOption(opt);
    setPolicyError(undefined);
    setSearchParams(opt ? { policyId: String(opt.id) } : {}, { replace: true });
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    if (policyOption === null) {
      setPolicyError('Wybierz polisę');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const normalizedFields: Record<string, string | number | boolean | number[]> = {};

    // Static fields
    const eventDate = data[STATIC_FIELD_KEYS.eventDate];
    const place = data[STATIC_FIELD_KEYS.placeOfAccident];
    const circumstances = data[STATIC_FIELD_KEYS.circumstances];
    if (eventDate) normalizedFields[STATIC_FIELD_KEYS.eventDate] = String(eventDate);
    if (place) normalizedFields[STATIC_FIELD_KEYS.placeOfAccident] = String(place);
    if (circumstances) normalizedFields[STATIC_FIELD_KEYS.circumstances] = String(circumstances);

    // Dynamic fields from API
    for (const field of fields) {
      const raw = data[field.key];
      if (raw === undefined || raw === '') continue;

      if (field.type === 'number') {
        normalizedFields[field.key] = Number(raw);
      } else if (field.type === 'bool') {
        normalizedFields[field.key] = Boolean(raw);
      } else if (field.type === 'select-single') {
        normalizedFields[field.key] = Number(raw);
      } else if (field.type === 'select-multi') {
        normalizedFields[field.key] = (raw as number[]).map(Number);
      } else {
        normalizedFields[field.key] = String(raw);
      }
    }

    try {
      await submitClaim({ policy_id: policyOption.id, fields: normalizedFields });
      navigate('/app/damages');
    } catch (err) {
      const message = (err as { message?: string }).message;
      setSubmitError(message ?? 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const noPolicy = policyOption === null;

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
          minHeight: 0,
          overflow: 'auto'
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* ── Header ──────────────────────────────── */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 4 }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{ fontSize: '32px', fontWeight: 300, lineHeight: '44px', color: '#1E1F21' }}
              >
                Zgłoś szkodę
              </Typography>
              {policyOption?.clientName && (
                <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#32343A', mt: 0.5 }}>
                  {policyOption.clientName}
                </Typography>
              )}
            </Box>

            <Stack direction="row" alignItems="center" spacing={2}>
              {policyOption?.policyNumber && (
                <Typography sx={{ fontSize: '14px', color: '#74767F' }}>
                  Karta polisy:{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: '#32343A' }}>
                    {policyOption.policyNumber}
                  </Box>
                </Typography>
              )}
              <Button
                variant="text"
                startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
                onClick={() => navigate('/app/damages')}
                sx={{
                  color: '#74767F',
                  textTransform: 'none',
                  fontWeight: 400,
                  fontSize: '14px',
                  px: 0,
                  '&:hover': { bgcolor: 'transparent', color: '#32343A' }
                }}
              >
                Wróć do listy
              </Button>
            </Stack>
          </Stack>

          {/* ── Form ──────────────────────────────── */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ maxWidth: 720, mx: 'auto' }}
          >
            <Stack spacing={3}>
              {/* ── Dane szczegółowe — zawsze statyczna ─── */}
              <SectionCard title="Dane szczegółowe">
                <PolicyAutocomplete
                  value={policyOption}
                  onChange={handlePolicyChange}
                  error={policyError}
                />
              </SectionCard>

              {/* ── Szczegóły zdarzenia — zawsze statyczna ─ */}
              <SectionCard title="Szczegóły zdarzenia">
                <Controller
                  name={STATIC_FIELD_KEYS.eventDate}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Data zdarzenia jest wymagana' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Data zdarzenia"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.placeOfAccident}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Miejsce zdarzenia jest wymagane' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Miejsce zdarzenia objętego ochroną ubezpieczeniową (kraj, adres, opis miejsca)"
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Wpisz"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.circumstances}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Okoliczności zajścia zdarzenia są wymagane' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Okoliczności zajścia zdarzenia (wszystkie okoliczności towarzyszące zdarzeniu ubezpieczeniowemu oraz powstania szkody)"
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Wpisz"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
              </SectionCard>

              {/* ── Dodatkowe informacje — dynamiczne z API ─ */}
              {(loadingFields || (!noPolicy && fields.length > 0)) && (
                <SectionCard title="Dodatkowe informacje">
                  {loadingFields && (
                    <Stack spacing={2.5}>
                      <Skeleton variant="rounded" height={56} />
                      <Skeleton variant="rounded" height={56} />
                      <Skeleton variant="rounded" height={56} />
                    </Stack>
                  )}
                  {!loadingFields &&
                    fields.map((field) => (
                      <DynamicField key={field.key} field={field} control={control} />
                    ))}
                </SectionCard>
              )}
            </Stack>

            {submitError && (
              <Typography color="error" sx={{ fontSize: '14px', mt: 2 }}>
                {submitError}
              </Typography>
            )}

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/app/damages')}
                disabled={submitting}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 3,
                  borderColor: '#E5E7EB',
                  color: '#32343A'
                }}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || noPolicy}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  px: 3,
                  bgcolor: '#1E1F21',
                  '&:hover': { bgcolor: '#32343A' },
                  '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' }
                }}
              >
                {submitting ? 'Wysyłanie…' : 'Zgłoś szkodę'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportClaimPage;
