import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Controller, useForm, type Control } from 'react-hook-form';
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
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {
  fetchClaimFormDefinition,
  getClaimDetails,
  submitClaim,
  updateClaim
} from '@/services/claimsService';
import type { ClaimFormField, ClaimUpdatePayload } from '@/services/claimsService';
import { fetchPoliciesTable, getPolicyDetails } from '@/services/policiesService';
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

const dynamicLabelSx = {
  color: 'rgba(0, 0, 0, 0.60)',
  fontFeatureSettings: "'liga' off, 'clig' off",
  fontFamily: 'Inter',
  fontSize: '14px',
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '143%',
  letterSpacing: '0.17px',
  pb: '12px'
} as const;

const dynamicPlaceholderSx = {
  color: 'rgba(0, 0, 0, 0.60)',
  fontFamily: 'Inter',
  fontSize: '14px',
  fontWeight: 400
} as const;

const selectMenuProps = {
  PaperProps: {
    sx: {
      bgcolor: '#FFFFFF',
      backgroundImage: 'none',
      border: '1px solid #E5E7EB',
      boxShadow: '0 12px 32px rgba(16, 24, 40, 0.12)',
      '& .MuiMenu-list': {
        bgcolor: '#FFFFFF'
      }
    }
  }
} as const;

const autocompleteSlotProps = {
  paper: {
    sx: {
      bgcolor: '#FFFFFF',
      backgroundImage: 'none',
      border: '1px solid #E5E7EB',
      boxShadow: '0 12px 32px rgba(16, 24, 40, 0.12)'
    }
  },
  listbox: {
    sx: {
      bgcolor: '#FFFFFF'
    }
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
  disabled?: boolean;
}

const PolicyAutocomplete: React.FC<PolicyAutocompleteProps> = ({
  value,
  onChange,
  error,
  disabled
}) => {
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
      disabled={disabled}
      slotProps={autocompleteSlotProps}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      onInputChange={(_e, newInput) => setInputValue(newInput)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      noOptionsText={inputValue.length > 0 ? 'Brak wyników' : 'Wpisz numer polisy…'}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: '#FFFFFF'
        },
        '&.Mui-disabled .MuiOutlinedInput-root': {
          bgcolor: '#F9FAFB'
        }
      }}
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
  control: Control<Record<string, unknown>>;
}

const ExternalLabelField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children
}) => (
  <Box>
    <Typography sx={dynamicLabelSx}>{label}</Typography>
    {children}
  </Box>
);

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
            <ExternalLabelField label={field.label}>
              <TextField
                {...f}
                fullWidth
                multiline
                minRows={3}
                placeholder="Wpisz"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={inputSx}
              />
            </ExternalLabelField>
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
            <ExternalLabelField label={field.label}>
              <TextField
                {...f}
                type="number"
                fullWidth
                placeholder="Wpisz"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={inputSx}
              />
            </ExternalLabelField>
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
            <ExternalLabelField label={field.label}>
              <TextField
                {...f}
                type="date"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={inputSx}
              />
            </ExternalLabelField>
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
            <ExternalLabelField label={field.label}>
              <TextField
                {...f}
                type="datetime-local"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                sx={inputSx}
              />
            </ExternalLabelField>
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
            <ExternalLabelField label={field.label}>
              <FormControl fullWidth error={!!fieldState.error} sx={inputSx}>
                <Select
                  {...f}
                  displayEmpty
                  MenuProps={selectMenuProps}
                  renderValue={(selected) =>
                    selected === '' ? (
                      <Typography component="span" sx={dynamicPlaceholderSx}>
                        Wpisz
                      </Typography>
                    ) : (
                      field.options?.find((opt) => opt.id === selected)?.label
                    )
                  }
                  sx={{
                    borderRadius: '8px',
                    bgcolor: '#FFFFFF',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C0C2C9' }
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
            </ExternalLabelField>
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
            <ExternalLabelField label={field.label}>
              <FormControl fullWidth error={!!fieldState.error} sx={inputSx}>
                <Select
                  {...f}
                  multiple
                  displayEmpty
                  MenuProps={selectMenuProps}
                  input={
                    <OutlinedInput
                      sx={{
                        borderRadius: '8px',
                        bgcolor: '#FFFFFF',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C0C2C9' }
                      }}
                    />
                  }
                  renderValue={(selected: number[]) =>
                    selected.length === 0 ? (
                      <Typography component="span" sx={dynamicPlaceholderSx}>
                        Wpisz
                      </Typography>
                    ) : (
                      selected
                        .map((id) => field.options?.find((o) => o.id === id)?.label ?? id)
                        .join(', ')
                    )
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
            </ExternalLabelField>
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
  circumstances: '__circumstances',
  street: '__street',
  streetNo: '__street_no',
  city: '__city',
  postal: '__postal',
  reportedDate: '__reported_date',
  claimNumber: '__claim_number',
  isVatPayer: '__is_vat_payer',
  isExclusiveClaim: '__is_exclusive_claim',
  exclusiveClaimNote: '__exclusive_claim_note',
  isTransferred: '__is_transferred',
  transferredNote: '__transferred_note',
  payoutAccountNo: '__payout_account_no'
} as const;

// ================== PAGE ==================

const ReportClaimPage: React.FC = () => {
  const navigate = useNavigate();
  const { claimId } = useParams<{ claimId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPolicyId = searchParams.get('policyId');
  const isEditMode = Boolean(claimId);

  const [policyOption, setPolicyOption] = useState<PolicyOption | null>(null);
  const [policyError, setPolicyError] = useState<string | undefined>(undefined);

  const [fields, setFields] = useState<ClaimFormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingClaim, setLoadingClaim] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch } = useForm<Record<string, unknown>>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      [STATIC_FIELD_KEYS.isVatPayer]: false,
      [STATIC_FIELD_KEYS.isExclusiveClaim]: false,
      [STATIC_FIELD_KEYS.isTransferred]: false
    }
  });

  const isExclusiveClaim = Boolean(watch(STATIC_FIELD_KEYS.isExclusiveClaim));
  const isTransferred = Boolean(watch(STATIC_FIELD_KEYS.isTransferred));

  const buildPayload = (data: Record<string, unknown>): ClaimUpdatePayload => {
    const meta: Record<string, string | number | boolean | number[]> = {};

    const eventDate = data[STATIC_FIELD_KEYS.eventDate];
    const place = data[STATIC_FIELD_KEYS.placeOfAccident];
    const circumstances = data[STATIC_FIELD_KEYS.circumstances];
    if (eventDate) meta[STATIC_FIELD_KEYS.eventDate] = String(eventDate);
    if (place) meta[STATIC_FIELD_KEYS.placeOfAccident] = String(place);
    if (circumstances) meta[STATIC_FIELD_KEYS.circumstances] = String(circumstances);

    for (const field of fields) {
      const raw = data[field.key];
      if (raw === undefined || raw === '') continue;

      if (field.type === 'number') {
        meta[field.key] = Number(raw);
      } else if (field.type === 'bool') {
        meta[field.key] = Boolean(raw);
      } else if (field.type === 'select-single') {
        meta[field.key] = Number(raw);
      } else if (field.type === 'select-multi') {
        meta[field.key] = (raw as number[]).map(Number);
      } else {
        meta[field.key] = String(raw);
      }
    }

    const optionalString = (value: unknown) => (value ? String(value) : undefined);

    return {
      claim_date: String(data[STATIC_FIELD_KEYS.eventDate]),
      is_vat_payer: Boolean(data[STATIC_FIELD_KEYS.isVatPayer]),
      is_exclusive_claim: Boolean(data[STATIC_FIELD_KEYS.isExclusiveClaim]),
      is_transferred: Boolean(data[STATIC_FIELD_KEYS.isTransferred]),
      street: String(data[STATIC_FIELD_KEYS.street]),
      street_no: String(data[STATIC_FIELD_KEYS.streetNo]),
      city: String(data[STATIC_FIELD_KEYS.city]),
      postal: String(data[STATIC_FIELD_KEYS.postal]),
      reported_date: optionalString(data[STATIC_FIELD_KEYS.reportedDate]),
      number: optionalString(data[STATIC_FIELD_KEYS.claimNumber]),
      claim_description: optionalString(circumstances),
      claim_address: optionalString(place),
      exclusive_claim_note: optionalString(data[STATIC_FIELD_KEYS.exclusiveClaimNote]),
      transferred_note: optionalString(data[STATIC_FIELD_KEYS.transferredNote]),
      payout_account_no: optionalString(data[STATIC_FIELD_KEYS.payoutAccountNo]),
      meta
    };
  };

  // Pre-load policy if arriving with ?policyId in URL
  useEffect(() => {
    if (!rawPolicyId || isEditMode) return;

    getPolicyDetails(rawPolicyId)
      .then((res) => {
        const policy = res.policy;
        setPolicyOption({
          id: policy.id,
          label: policy.number ?? `Polisa #${policy.id}`,
          clientName: '',
          policyNumber: policy.number ?? ''
        });
      })
      .catch(() => setPolicyError('Nie udało się pobrać wybranej polisy'));
  }, [rawPolicyId, isEditMode]);

  useEffect(() => {
    if (!claimId) return;

    let cancelled = false;
    setLoadingClaim(true);
    setSubmitError(null);

    getClaimDetails(claimId)
      .then((res) => {
        if (cancelled) return;
        const claim = res.claim;
        const policy = claim.policy;
        const meta = claim.meta ?? {};

        setPolicyOption({
          id: claim.policy_id,
          label: policy?.number ?? `Polisa #${claim.policy_id}`,
          clientName: '',
          policyNumber: policy?.number ?? ''
        });

        reset({
          ...meta,
          [STATIC_FIELD_KEYS.reportedDate]: claim.reported_date ?? '',
          [STATIC_FIELD_KEYS.eventDate]: claim.claim_date ?? '',
          [STATIC_FIELD_KEYS.claimNumber]: claim.number ?? '',
          [STATIC_FIELD_KEYS.placeOfAccident]: claim.claim_address ?? '',
          [STATIC_FIELD_KEYS.circumstances]: claim.claim_description ?? '',
          [STATIC_FIELD_KEYS.street]: claim.address?.street ?? '',
          [STATIC_FIELD_KEYS.streetNo]: claim.address?.street_no ?? '',
          [STATIC_FIELD_KEYS.city]: claim.address?.city ?? '',
          [STATIC_FIELD_KEYS.postal]: claim.address?.postal ?? '',
          [STATIC_FIELD_KEYS.isVatPayer]: claim.is_vat_payer,
          [STATIC_FIELD_KEYS.isExclusiveClaim]: claim.is_exclusive_claim,
          [STATIC_FIELD_KEYS.exclusiveClaimNote]: claim.exclusive_claim_note ?? '',
          [STATIC_FIELD_KEYS.isTransferred]: claim.is_transferred,
          [STATIC_FIELD_KEYS.transferredNote]: claim.transferred_note ?? '',
          [STATIC_FIELD_KEYS.payoutAccountNo]: claim.payout_account_no ?? ''
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { message?: string }).message;
        setSubmitError(message ?? 'Nie udało się pobrać danych szkody.');
      })
      .finally(() => {
        if (!cancelled) setLoadingClaim(false);
      });

    return () => {
      cancelled = true;
    };
  }, [claimId, reset]);

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
    if (isEditMode) return;
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

    try {
      const payload = buildPayload(data);
      if (isEditMode && claimId) {
        await updateClaim(claimId, payload);
      } else {
        await submitClaim({ policy_id: policyOption.id, ...payload });
      }
      navigate('/app/damages');
    } catch (err) {
      const message = (err as { message?: string }).message;
      setSubmitError(message ?? 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const noPolicy = policyOption === null;
  const pageTitle = isEditMode ? 'Edytuj szkodę' : 'Zgłoś szkodę';

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
                {pageTitle}
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
                  disabled={!!rawPolicyId || isEditMode}
                />
              </SectionCard>

              {/* ── Szczegóły zdarzenia — zawsze statyczna ─ */}
              <SectionCard title="Szczegóły zdarzenia">
                <Controller
                  name={STATIC_FIELD_KEYS.reportedDate}
                  control={control}
                  defaultValue=""
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Data zgłoszenia"
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
                  name={STATIC_FIELD_KEYS.claimNumber}
                  control={control}
                  defaultValue=""
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Nr szkody"
                      fullWidth
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
                    <ExternalLabelField label="Miejsce zdarzenia objętego ochroną ubezpieczeniową (kraj, adres, opis miejsca)">
                      <TextField
                        {...f}
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Wpisz"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={inputSx}
                      />
                    </ExternalLabelField>
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.circumstances}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Okoliczności zajścia zdarzenia są wymagane' }}
                  render={({ field: f, fieldState }) => (
                    <ExternalLabelField label="Okoliczności zajścia zdarzenia (wszystkie okoliczności towarzyszące zdarzeniu ubezpieczeniowemu oraz powstania szkody)">
                      <TextField
                        {...f}
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Wpisz"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={inputSx}
                      />
                    </ExternalLabelField>
                  )}
                />
              </SectionCard>

              <SectionCard title="Adres zdarzenia">
                <Controller
                  name={STATIC_FIELD_KEYS.street}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Ulica jest wymagana' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Ulica"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.streetNo}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Numer jest wymagany' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Numer"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.city}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Miasto jest wymagane' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Miasto"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.postal}
                  control={control}
                  defaultValue=""
                  rules={{ required: 'Kod pocztowy jest wymagany' }}
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Kod pocztowy"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputSx}
                    />
                  )}
                />
              </SectionCard>

              <SectionCard title="Rozliczenie">
                <Controller
                  name={STATIC_FIELD_KEYS.isVatPayer}
                  control={control}
                  render={({ field: f }) => (
                    <FormControlLabel
                      control={<Checkbox {...f} checked={!!f.value} />}
                      label="Poszkodowany jest płatnikiem VAT"
                    />
                  )}
                />
                <Controller
                  name={STATIC_FIELD_KEYS.isExclusiveClaim}
                  control={control}
                  render={({ field: f }) => (
                    <FormControlLabel
                      control={<Checkbox {...f} checked={!!f.value} />}
                      label="Roszczenie wyłączne"
                    />
                  )}
                />
                {isExclusiveClaim && (
                  <Controller
                    name={STATIC_FIELD_KEYS.exclusiveClaimNote}
                    control={control}
                    defaultValue=""
                    render={({ field: f, fieldState }) => (
                      <TextField
                        {...f}
                        label="Notatka do roszczenia wyłącznego"
                        fullWidth
                        multiline
                        minRows={2}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={inputSx}
                      />
                    )}
                  />
                )}
                <Controller
                  name={STATIC_FIELD_KEYS.isTransferred}
                  control={control}
                  render={({ field: f }) => (
                    <FormControlLabel
                      control={<Checkbox {...f} checked={!!f.value} />}
                      label="Cesja / przeniesienie"
                    />
                  )}
                />
                {isTransferred && (
                  <Controller
                    name={STATIC_FIELD_KEYS.transferredNote}
                    control={control}
                    defaultValue=""
                    render={({ field: f, fieldState }) => (
                      <TextField
                        {...f}
                        label="Notatka do cesji"
                        fullWidth
                        multiline
                        minRows={2}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={inputSx}
                      />
                    )}
                  />
                )}
                <Controller
                  name={STATIC_FIELD_KEYS.payoutAccountNo}
                  control={control}
                  defaultValue=""
                  render={({ field: f, fieldState }) => (
                    <TextField
                      {...f}
                      label="Nr konta do wypłaty odszkodowania"
                      fullWidth
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
                disabled={submitting || noPolicy || loadingClaim}
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
                {submitting ? 'Wysyłanie…' : isEditMode ? 'Zapisz zmiany' : 'Zgłoś szkodę'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportClaimPage;
