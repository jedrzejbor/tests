import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ClaimPasswordDialog from '@/components/dialogs/ClaimPasswordDialog';
import {
  fetchClaimFormDefinition,
  getClaimDetails,
  type ClaimFormField,
  type ClaimRecord,
  type ClaimResource
} from '@/services/claimsService';
import { usePermission } from '@/hooks/usePermission';

const CLAIM_TABS = [
  'Dane szkody',
  'Dokumentacja urzędowa',
  'Dokumentacja przesyłana do ZU',
  'Dokumentacja szkodowa',
  'Decyzja',
  'Osoby kontaktowe'
];

const STATIC_META_KEYS = new Set(['__event_date', '__circumstances', '__place_of_accident']);

const UnavailableTabContent = () => (
  <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
      Funkcjonalność jeszcze niedostępna
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Ta sekcja zostanie udostępniona w przyszłej wersji aplikacji.
    </Typography>
  </Box>
);

const FieldItem = ({ label, value }: { label: string; value?: string }) => (
  <Box sx={{ flex: 1, minWidth: 0, p: 1.5 }}>
    <Typography
      variant="body2"
      sx={{
        color: '#74767F',
        mb: 1,
        fontSize: '14px',
        lineHeight: 1.43,
        letterSpacing: '0.17px'
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: '#32343A',
        fontWeight: 500,
        fontSize: '14px',
        lineHeight: 1.57,
        letterSpacing: '0.1px',
        overflowWrap: 'anywhere'
      }}
    >
      {value || '-'}
    </Typography>
  </Box>
);

interface AdditionalInfoField {
  key: string;
  label: string;
  value: string;
}

const AdditionalInfoRow = ({ item }: { item: AdditionalInfoField }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 32%) minmax(0, 1fr)' },
      minWidth: 0,
      borderTop: '1px solid rgba(143, 109, 95, 0.12)',
      '&:first-of-type': {
        borderTop: 0
      }
    }}
  >
    <Box
      sx={{
        minWidth: 0,
        px: 1.5,
        py: 1.25,
        bgcolor: { xs: '#FAFAFA', md: 'transparent' },
        borderRight: { xs: 0, md: '1px solid rgba(143, 109, 95, 0.12)' }
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: '#74767F',
          fontSize: '13px',
          lineHeight: 1.45,
          letterSpacing: '0.17px',
          overflowWrap: 'anywhere'
        }}
      >
        {item.label}
      </Typography>
    </Box>
    <Box
      sx={{
        minWidth: 0,
        px: 1.5,
        py: 1.25
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: '#32343A',
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: 1.6,
          letterSpacing: '0.1px',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap'
        }}
      >
        {item.value || '-'}
      </Typography>
    </Box>
  </Box>
);

const DetailCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card
    sx={{
      borderRadius: 1,
      boxShadow: 'none',
      border: '1px solid',
      borderColor: 'rgba(143, 109, 95, 0.12)'
    }}
  >
    <CardContent sx={{ p: 2 }}>
      <Typography
        sx={{
          fontWeight: 600,
          color: '#32343A',
          fontSize: '15px',
          borderBottom: '1px solid',
          borderColor: 'rgba(143, 109, 95, 0.12)',
          pb: 0.75,
          px: 1.5,
          mb: 2
        }}
      >
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

const ValueChip = ({ label }: { label?: string }) => {
  if (!label) return <FieldItem label="" value="-" />;

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        fontSize: '13px',
        height: 24,
        bgcolor: '#EEEEEF',
        color: '#32343A',
        fontWeight: 400
      }}
    />
  );
};

const getPolicyNumber = (claim: ClaimResource | null) => {
  if (!claim) return '';
  return claim.policy?.number ?? '';
};

const getClientName = (claim: ClaimResource | null) => {
  if (!claim) return '';
  const policy = claim.policy as
    | (ClaimResource['policy'] & {
        client?: { name?: string };
        client_data?: { name?: string };
        client_name?: string;
        clientName?: string;
        client_full_name?: string;
        clientFullName?: string;
        client_company_name?: string;
        clientCompanyName?: string;
        client_id?: string | number;
      })
    | undefined;

  return (
    policy?.client?.name ??
    policy?.client_data?.name ??
    policy?.client_name ??
    policy?.clientName ??
    policy?.client_full_name ??
    policy?.clientFullName ??
    policy?.client_company_name ??
    policy?.clientCompanyName ??
    ''
  );
};

const getPolicyData = (claim: ClaimResource | null) =>
  claim?.policy as
    | (ClaimResource['policy'] & {
        type?: string | { name?: string };
        policy_type?: string | { name?: string };
        policyType?: string | { name?: string };
        insurance_company?: string | { name?: string };
        insuranceCompany?: string | { name?: string };
        client?: {
          name?: string;
          nip?: string;
          regon?: string;
        };
        client_data?: {
          name?: string;
          nip?: string;
          regon?: string;
        };
        client_nip?: string;
        clientNip?: string;
        client_regon?: string;
        clientRegon?: string;
      })
    | undefined;

const getNameValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
};

const getPolicyTypeName = (claim: ClaimResource | null) => {
  const policy = getPolicyData(claim);
  return (
    getNameValue(policy?.type) ||
    getNameValue(policy?.policy_type) ||
    getNameValue(policy?.policyType) ||
    policy?.policy_type_name ||
    ''
  );
};

const getInsuranceCompanyName = (claim: ClaimResource | null) => {
  const policy = getPolicyData(claim);
  return (
    getNameValue(policy?.insurance_company) ||
    getNameValue(policy?.insuranceCompany) ||
    policy?.insurance_company_name ||
    ''
  );
};

const getClientNip = (claim: ClaimResource | null) => {
  const policy = getPolicyData(claim);
  return (
    policy?.client?.nip ?? policy?.client_data?.nip ?? policy?.client_nip ?? policy?.clientNip ?? ''
  );
};

const getClientRegon = (claim: ClaimResource | null) => {
  const policy = getPolicyData(claim);
  return (
    policy?.client?.regon ??
    policy?.client_data?.regon ??
    policy?.client_regon ??
    policy?.clientRegon ??
    ''
  );
};

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  const [year, month, day] = date.slice(0, 10).split('-');
  if (!year || !month || !day) return date;
  return `${day}.${month}.${year}`;
};

const deriveClaimType = (policyTypeName: string) => {
  if (policyTypeName.includes('Pojazd')) return 'Komunikacyjna';
  if (policyTypeName.includes('Osoba')) return 'Osobowa';
  if (policyTypeName.includes('Majątek')) return 'Majątkowa';
  return policyTypeName ? 'Inna' : '';
};

const getMetaValue = (claim: ClaimResource, keys: string[]) => {
  const meta = claim.meta ?? {};
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return '';
};

const formatMetaDisplayValue = (field: ClaimFormField, value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';

  if (field.type === 'bool') {
    return value === true || value === 1 || value === '1' ? 'Tak' : 'Nie';
  }

  if (field.type === 'date') {
    return typeof value === 'string' ? formatDate(value) : String(value);
  }

  if (field.type === 'datetime') {
    return typeof value === 'string' ? value.replace('T', ' ') : String(value);
  }

  if (field.type === 'select-single') {
    const option = field.options?.find((opt) => String(opt.id) === String(value));
    return option?.label ?? String(value);
  }

  if (field.type === 'select-multi') {
    const values = Array.isArray(value) ? value : [value];
    return values
      .map((item) => {
        const option = field.options?.find((opt) => String(opt.id) === String(item));
        return option?.label ?? String(item);
      })
      .join(', ');
  }

  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const humanizeMetaKey = (key: string): string =>
  key
    .replace(/^__/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatClaimAddress = (claim: ClaimResource) => {
  if (claim.claim_address) return claim.claim_address;
  return '';
};

const ClaimDetailsPage: React.FC = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { hasPermission } = usePermission();

  const [claim, setClaim] = useState<ClaimResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [claimFormFields, setClaimFormFields] = useState<ClaimFormField[]>([]);

  useEffect(() => {
    if (!claimId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getClaimDetails(claimId)
      .then((res) => {
        if (!cancelled) setClaim(res.claim);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { message?: string }).message;
        setError(message ?? 'Nie udało się pobrać danych szkody.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [claimId]);

  useEffect(() => {
    if (!claim?.policy_id) {
      setClaimFormFields([]);
      return;
    }

    let cancelled = false;

    fetchClaimFormDefinition(claim.policy_id)
      .then((res) => {
        if (!cancelled) setClaimFormFields(res.fields);
      })
      .catch(() => {
        if (!cancelled) setClaimFormFields([]);
      });

    return () => {
      cancelled = true;
    };
  }, [claim?.policy_id]);

  const claimRecord = useMemo<ClaimRecord | null>(() => {
    if (!claim) return null;
    return {
      id: claim.id,
      policy_id: claim.policy_id,
      policy_number: getPolicyNumber(claim),
      client_name: getClientName(claim),
      reported_date: claim.reported_date ?? undefined,
      claim_date: claim.claim_date,
      number: claim.number ?? undefined,
      claim_address: claim.claim_address ?? undefined,
      deleted_at: claim.deleted_at ?? null
    };
  }, [claim]);

  const claimNumber = claim?.number || (claim?.id ? String(claim.id) : 'XXXXXXXX');
  const clientName = getClientName(claim) || '-';
  const policyNumber = getPolicyNumber(claim);
  const policyTypeName = getPolicyTypeName(claim);
  const claimType = deriveClaimType(policyTypeName);

  const handleBack = () => {
    navigate('/app/damages');
  };

  const MobileSectionHeader = ({
    title,
    open,
    onToggle
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
  }) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        bgcolor: 'rgba(143, 109, 95, 0.04)',
        borderRadius: '8px',
        py: 0.75,
        px: 1.5
      }}
    >
      <Typography sx={{ fontWeight: 500, color: '#32343A', fontSize: '14px' }}>{title}</Typography>
      <IconButton size="small" onClick={onToggle}>
        <ExpandMoreIcon
          sx={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </IconButton>
    </Stack>
  );

  const MobileFieldRow = ({ label, value }: { label: string; value?: string }) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ height: 40, px: 1.5, py: 0.75 }}
    >
      <Typography
        sx={{ color: '#74767F', fontSize: '14px', lineHeight: 1.43, letterSpacing: '0.17px' }}
      >
        {label}
      </Typography>
      <Typography sx={{ color: '#32343A', fontSize: '12px', lineHeight: '16px' }}>
        {value || '-'}
      </Typography>
    </Stack>
  );

  const getClaimContentFields = () => {
    if (!claim)
      return {
        reportedBy: '',
        injured: '',
        perpetrator: '',
        peselOrNip: '',
        claimTime: '',
        additionalInfoFields: [] as AdditionalInfoField[]
      };
    const reportedBy = getMetaValue(claim, [
      'reported_by',
      'reporting_person',
      'zgloszone_przez',
      'zgłoszone_przez',
      'reporter',
      'claimant'
    ]);
    const injured = getMetaValue(claim, ['injured', 'injured_person', 'poszkodowany', 'victim']);
    const perpetrator = getMetaValue(claim, ['perpetrator', 'sprawca', 'causer']);
    const peselOrNip = getMetaValue(claim, [
      'nip_pesel',
      'nip/pesel',
      'pesel',
      'nip',
      'claimant_identifier'
    ]);
    const claimTime = getMetaValue(claim, [
      'claim_time',
      'event_time',
      'czas_szkody',
      'time',
      '__event_time'
    ]);
    const meta = claim.meta ?? {};
    const dynamicFields = claimFormFields
      .filter((field) => !STATIC_META_KEYS.has(field.key))
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: formatMetaDisplayValue(field, meta[field.key])
      }))
      .filter((item) => item.value !== '');
    const knownDynamicKeys = new Set(claimFormFields.map((field) => field.key));
    const extraMetaFields = Object.entries(meta)
      .filter(
        ([key, value]) =>
          !STATIC_META_KEYS.has(key) &&
          !knownDynamicKeys.has(key) &&
          value !== undefined &&
          value !== null &&
          value !== ''
      )
      .map(([key, value]) => ({
        key,
        label: humanizeMetaKey(key),
        value: Array.isArray(value) ? value.join(', ') : String(value)
      }));
    return {
      reportedBy,
      injured,
      perpetrator,
      peselOrNip,
      claimTime,
      additionalInfoFields: [...dynamicFields, ...extraMetaFields] as AdditionalInfoField[]
    };
  };

  const ClaimDataDesktop = () => {
    if (!claim) return null;
    const { reportedBy, injured, perpetrator, peselOrNip, claimTime, additionalInfoFields } =
      getClaimContentFields();

    return (
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: '20px', fontWeight: 500, color: '#32343A' }}>
            Dane szczegółowe
          </Typography>
          <Button
            variant="outlined"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate(`/app/damages/${claim.id}/edit`)}
            sx={{
              borderColor: '#1E1F21',
              color: '#1E1F21',
              borderRadius: '8px',
              px: 2.25,
              py: 1,
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
              '&:hover': { borderColor: '#1E1F21', bgcolor: 'rgba(0, 0, 0, 0.04)' }
            }}
          >
            Edytuj dane
          </Button>
        </Stack>

        <DetailCard title="Dane firmy">
          <Stack direction="row">
            <FieldItem label="Klient" value={clientName} />
            <Box sx={{ flex: 1, minWidth: 0, p: 1.5 }}>
              <Typography
                variant="body2"
                sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43 }}
              >
                Typ polisy
              </Typography>
              <ValueChip label={policyTypeName} />
            </Box>
            <FieldItem label="Ubezpieczyciel" value={getInsuranceCompanyName(claim)} />
            <FieldItem label="Numer polisy" value={policyNumber} />
            <FieldItem label="NIP" value={getClientNip(claim)} />
            <FieldItem label="REGON" value={getClientRegon(claim)} />
          </Stack>
        </DetailCard>

        <DetailCard title="Dane szkody">
          <Stack direction="row" sx={{ mb: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0, p: 1.5 }}>
              <Typography
                variant="body2"
                sx={{ color: '#74767F', mb: 1, fontSize: '14px', lineHeight: 1.43 }}
              >
                Rodzaj szkody
              </Typography>
              <ValueChip label={claimType} />
            </Box>
            <FieldItem label="Numer szkody" value={claim.number ?? ''} />
            <FieldItem label="Data szkody" value={formatDate(claim.claim_date)} />
            <FieldItem label="Czas szkody" value={claimTime} />
            <FieldItem label="Data zgłoszenia do ZU" value={formatDate(claim.reported_date)} />
          </Stack>
          <Stack direction="row">
            <FieldItem label="Zgłoszone przez" value={reportedBy} />
            <FieldItem label="NIP/Pesel" value={peselOrNip} />
            <FieldItem label="Poszkodowany" value={injured} />
            <FieldItem label="Sprawca" value={perpetrator} />
            <FieldItem label="Miejsce wystąpienia szkody" value={formatClaimAddress(claim)} />
          </Stack>
        </DetailCard>

        <DetailCard title="Dodatkowe informacje">
          {additionalInfoFields.length > 0 ? (
            <Box
              sx={{
                mx: 1.5,
                border: '1px solid rgba(143, 109, 95, 0.12)',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 32%) minmax(0, 1fr)',
                  bgcolor: '#FAFAFA',
                  borderBottom: '1px solid rgba(143, 109, 95, 0.12)'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    px: 1.5,
                    py: 1,
                    color: '#74767F',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    borderRight: '1px solid rgba(143, 109, 95, 0.12)'
                  }}
                >
                  Pole
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    px: 1.5,
                    py: 1,
                    color: '#74767F',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}
                >
                  Wartość
                </Typography>
              </Box>
              {additionalInfoFields.map((item) => (
                <AdditionalInfoRow key={item.key} item={item} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#74767F', px: 1.5, py: 1 }}>
              Brak dodatkowych informacji
            </Typography>
          )}
        </DetailCard>
      </Stack>
    );
  };

  const ClaimDataMobile = () => {
    const [firmaOpen, setFirmaOpen] = useState(true);
    const [szkodaOpen, setSzkodaOpen] = useState(true);
    const [extraOpen, setExtraOpen] = useState(true);

    if (!claim) return null;
    const { reportedBy, injured, perpetrator, peselOrNip, claimTime, additionalInfoFields } =
      getClaimContentFields();

    return (
      <Box sx={{ px: 1 }}>
        {/* Section header */}
        <Box sx={{ bgcolor: 'rgba(143, 109, 95, 0.08)', borderRadius: '8px', p: 1.5, mb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 500, color: '#32343A', fontSize: '15px' }}>
              Dane szczegółowe
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate(`/app/damages/${claim.id}/edit`)}
              sx={{
                borderColor: '#494B54',
                color: '#494B54',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '12px',
                py: 0.5
              }}
            >
              Edytuj
            </Button>
          </Stack>
        </Box>

        {/* Dane firmy */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mb: 1
          }}
        >
          <CardContent sx={{ p: 1 }}>
            <MobileSectionHeader
              title="Dane firmy"
              open={firmaOpen}
              onToggle={() => setFirmaOpen((v) => !v)}
            />
            <Collapse in={firmaOpen}>
              <Stack sx={{ pb: 1 }}>
                <MobileFieldRow label="Klient" value={clientName} />
                <MobileFieldRow label="Typ polisy" value={policyTypeName} />
                <MobileFieldRow label="Ubezpieczyciel" value={getInsuranceCompanyName(claim)} />
                <MobileFieldRow label="Numer polisy" value={policyNumber} />
                <MobileFieldRow label="NIP" value={getClientNip(claim)} />
                <MobileFieldRow label="REGON" value={getClientRegon(claim)} />
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        {/* Dane szkody */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mb: 1
          }}
        >
          <CardContent sx={{ p: 1 }}>
            <MobileSectionHeader
              title="Dane szkody"
              open={szkodaOpen}
              onToggle={() => setSzkodaOpen((v) => !v)}
            />
            <Collapse in={szkodaOpen}>
              <Stack sx={{ pb: 1 }}>
                <MobileFieldRow label="Rodzaj szkody" value={claimType} />
                <MobileFieldRow label="Numer szkody" value={claim.number ?? ''} />
                <MobileFieldRow label="Data szkody" value={formatDate(claim.claim_date)} />
                <MobileFieldRow label="Czas szkody" value={claimTime} />
                <MobileFieldRow
                  label="Data zgłoszenia do ZU"
                  value={formatDate(claim.reported_date)}
                />
                <MobileFieldRow label="Zgłoszone przez" value={reportedBy} />
                <MobileFieldRow label="NIP/Pesel" value={peselOrNip} />
                <MobileFieldRow label="Poszkodowany" value={injured} />
                <MobileFieldRow label="Sprawca" value={perpetrator} />
                <MobileFieldRow label="Miejsce wystąpienia" value={formatClaimAddress(claim)} />
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        {/* Dodatkowe informacje */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mb: 1
          }}
        >
          <CardContent sx={{ p: 1 }}>
            <MobileSectionHeader
              title="Dodatkowe informacje"
              open={extraOpen}
              onToggle={() => setExtraOpen((v) => !v)}
            />
            <Collapse in={extraOpen}>
              <Stack sx={{ pb: 1 }}>
                {additionalInfoFields.length > 0 ? (
                  additionalInfoFields.map((item) => (
                    <MobileFieldRow key={item.key} label={item.label} value={item.value} />
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: '#74767F', px: 1.5, py: 1 }}>
                    Brak dodatkowych informacji
                  </Typography>
                )}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          {hasPermission('claim archive') && !claim.deleted_at && (
            <Button
              variant="outlined"
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
              onClick={() => setArchiveDialogOpen(true)}
              sx={{
                borderColor: '#D0D5DD',
                color: '#1E1F21',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none'
              }}
            >
              Usuń szkodę
            </Button>
          )}
          {/* TODO: Restore notification action when the backend flow is ready.
          <Button variant="contained" startIcon={<NotificationsIcon sx={{ fontSize: 18 }} />}>
            Wyślij powiadomienie
          </Button>
          */}
        </Stack>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error || !claim) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>
          {error ?? 'Nie znaleziono szkody.'}
        </Typography>
        <Button onClick={() => navigate('/app/damages')} sx={{ textTransform: 'none' }}>
          Wróć do listy
        </Button>
      </Box>
    );
  }

  if (!isMdUp) {
    return (
      <Stack
        spacing={2}
        sx={{
          bgcolor: 'white',
          borderRadius: 4,
          pb: 2,
          height: '100%',
          overflow: 'auto'
        }}
      >
        <Box sx={{ borderBottom: '1px solid #D0D5DD', py: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5 }}>
            <IconButton onClick={handleBack} sx={{ borderRadius: '8px', p: 1 }}>
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Stack>
              <Typography
                sx={{
                  fontSize: '20px',
                  fontWeight: 300,
                  color: '#32343A',
                  lineHeight: '32px',
                  letterSpacing: '-0.4px'
                }}
              >
                {clientName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: '#74767F',
                  lineHeight: 1.43
                }}
              >
                Karta szkody:{' '}
                <Typography
                  component="span"
                  sx={{ fontWeight: 600, fontSize: '13px', color: '#32343A' }}
                >
                  {claimNumber}
                </Typography>
                {policyNumber && '  '}
                {policyNumber && 'Polisa: '}
                {policyNumber && (
                  <Typography
                    component="span"
                    sx={{ fontWeight: 600, fontSize: '13px', color: '#32343A' }}
                  >
                    {policyNumber}
                  </Typography>
                )}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ px: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '13px',
                minHeight: 36,
                py: 0.5,
                px: 1.5
              }
            }}
          >
            {CLAIM_TABS.map((label) => (
              <Tab key={label} label={label} />
            ))}
          </Tabs>
        </Box>

        {activeTab === 0 ? <ClaimDataMobile /> : <UnavailableTabContent />}

        <ClaimPasswordDialog
          open={archiveDialogOpen}
          onClose={() => setArchiveDialogOpen(false)}
          claim={claimRecord}
          mode="archive"
          onSuccess={() => navigate('/app/damages')}
        />
      </Stack>
    );
  }

  return (
    <Stack
      spacing={3}
      sx={{
        bgcolor: 'white',
        borderRadius: 1,
        py: 3,
        px: 3,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography
            sx={{
              fontSize: '32px',
              fontWeight: 300,
              color: '#32343A',
              letterSpacing: '0.25px',
              lineHeight: 1.235
            }}
          >
            {clientName}
          </Typography>

          <Stack direction="row" spacing={2}>
            {hasPermission('claim archive') && !claim.deleted_at && (
              <Button
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => setArchiveDialogOpen(true)}
                sx={{
                  borderColor: '#D0D5DD',
                  color: '#1E1F21',
                  borderRadius: '8px',
                  px: 2.25,
                  py: 1,
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                  boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
                  '&:hover': {
                    borderColor: '#D0D5DD',
                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                Usuń szkodę
              </Button>
            )}
            {/* TODO: Restore notification action when the backend flow is ready.
            <Button variant="contained" startIcon={<NotificationsIcon sx={{ fontSize: 18 }} />}>
              Wyślij powiadomienie
            </Button>
            */}
          </Stack>
        </Stack>

        <Typography
          sx={{
            fontSize: '16px',
            color: '#74767F',
            lineHeight: 1.5
          }}
        >
          Karta szkody:{' '}
          <Typography component="span" sx={{ fontWeight: 600, fontSize: '16px', color: '#32343A' }}>
            {claimNumber}
          </Typography>
          {policyNumber && '  '}
          {policyNumber && 'Polisa: '}
          {policyNumber && (
            <Typography
              component="span"
              sx={{ fontWeight: 600, fontSize: '16px', color: '#32343A' }}
            >
              {policyNumber}
            </Typography>
          )}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 400,
              minHeight: 40,
              py: 1,
              px: 2,
              color: '#74767F',
              '&.Mui-selected': {
                color: '#1E1F21',
                fontWeight: 500
              }
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#1E1F21'
            },
            '& .Mui-disabled': {
              display: 'none'
            }
          }}
        >
          {CLAIM_TABS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 0 ? <ClaimDataDesktop /> : <UnavailableTabContent />}
      </Box>

      <ClaimPasswordDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        claim={claimRecord}
        mode="archive"
        onSuccess={() => navigate('/app/damages')}
      />
    </Stack>
  );
};

export default ClaimDetailsPage;
