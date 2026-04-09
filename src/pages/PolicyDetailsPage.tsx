import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  type PolicyDetailsData,
  type PolicyRecord,
  getPolicyDetails
} from '@/services/policiesService';
import {
  type ClientDetailsApiClient,
  type ClientDetailsResponse,
  getClientDetails
} from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import ArchivePolicyDialog from '@/components/dialogs/ArchivePolicyDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientData {
  id: string | number;
  name: string;
  nip: string;
  regon: string;
  krs: string;
  bank_account: string;
  website: string;
  email: string;
  city: string;
  postal: string;
  street: string;
  street_no: string;
  phone: string;
  authority_scope: string;
  type: string;
  status: string;
  parent_client: string;
  child_client: string;
  child_client_names: string[];
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

const FieldItem = ({ label, value }: { label: string; value?: string }) => (
  <Box sx={{ flex: 1, p: 1.5 }}>
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
        letterSpacing: '0.1px'
      }}
    >
      {value || '-'}
    </Typography>
  </Box>
);

const MobileFieldRow = ({ label, value }: { label: string; value?: string }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ height: 40, px: 1.5, py: 0.75 }}
  >
    <Typography
      sx={{
        color: '#74767F',
        fontSize: '14px',
        lineHeight: 1.43,
        letterSpacing: '0.17px'
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        color: '#32343A',
        fontSize: '12px',
        lineHeight: '16px'
      }}
    >
      {value || '-'}
    </Typography>
  </Stack>
);

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const POLICY_TABS = [
  {
    label: 'Dane klienta',
    icon: <PersonOutlineIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Dane ubezpieczyciela',
    icon: <BusinessOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Dane polisy',
    icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Przedmioty ubezpieczenia',
    icon: <CategoryOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Zestawienie płatności składek',
    icon: <PaymentsOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Dodatkowe informacje',
    icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Cesje',
    icon: <SwapHorizOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Szkody',
    icon: <ReportProblemOutlinedIcon sx={{ fontSize: 18 }} />
  },
  {
    label: 'Dokumenty',
    icon: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
  }
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PolicyDetailsPage: React.FC = () => {
  const { policyId } = useParams<{ policyId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { addToast } = useUiStore();
  const { hasPermission } = usePermission();

  const [policyData, setPolicyData] = useState<PolicyDetailsData | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [insurerName, setInsurerName] = useState<string>('');
  const [policyNumber, setPolicyNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Archive dialog
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Mobile collapsible sections (for "Dane klienta" tab)
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [addressOpen, setAddressOpen] = useState(true);
  const [relationsOpen, setRelationsOpen] = useState(true);

  // ---------------------------------------------------------------------------
  // Map client API data to local structure
  // ---------------------------------------------------------------------------

  const mapClientData = useCallback(
    (api: ClientDetailsApiClient, responseMeta?: ClientDetailsResponse['meta']): ClientData => {
      const tooltipContent = responseMeta?.columns?.['child_client']?.tooltip?.content;
      let childClientNames: string[] = [];
      if (tooltipContent) {
        if (Array.isArray(tooltipContent)) {
          childClientNames = tooltipContent.filter((v): v is string => typeof v === 'string');
        } else if (typeof tooltipContent === 'object' && tooltipContent !== null) {
          childClientNames = Object.values(tooltipContent as Record<string, string>).filter(
            (v): v is string => typeof v === 'string'
          );
        }
      }
      if (childClientNames.length === 0 && api.child_client) {
        childClientNames = [api.child_client];
      }
      return {
        id: api.id,
        name: api.name || '',
        nip: api.nip || '',
        regon: api.regon || '',
        krs: api.krs || '',
        bank_account: api.bank_account || '',
        website: api.website || '',
        email: api.email || '',
        city: api.city || '',
        postal: api.postal || '',
        street: api.street || '',
        street_no: api.street_no || '',
        phone: api.phone || '',
        authority_scope: api.authority_scope || '',
        type: api.type || '',
        status: api.status || '',
        parent_client: api.parent_client || api.parent_client_name || '',
        child_client: api.child_client || api.child_client_name || '',
        child_client_names: childClientNames
      };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Fetch policy + client data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Try to pre-fill from navigation state (PolicyRecord from the list)
      const statePolicy = (location.state as { policy?: PolicyRecord })?.policy;
      if (statePolicy) {
        setClientName(statePolicy.client || '');
        setInsurerName(statePolicy.insurance_company || '');
        setPolicyNumber(statePolicy.number || '');
      }

      if (!policyId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch policy details
        const policyResponse = await getPolicyDetails(policyId);
        const policy = policyResponse.policy;
        setPolicyData(policy);
        setPolicyNumber(policy.number || statePolicy?.number || '');

        // Use names from state if we have them (backend only returns IDs)
        if (statePolicy) {
          setClientName(statePolicy.client || '');
          setInsurerName(statePolicy.insurance_company || '');
        }

        // 2. Fetch client details using client_id from policy
        if (policy.client_id) {
          try {
            const clientResponse = await getClientDetails(policy.client_id);
            setClientData(mapClientData(clientResponse.client, clientResponse.meta));
            setClientName(clientResponse.client.name || statePolicy?.client || '');
          } catch {
            // Client fetch failed — we still show what we have
          }
        }
      } catch (error) {
        const apiError = error as ApiError;

        if (apiError?.status === 401) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Sesja wygasła. Zaloguj się ponownie.',
            severity: 'error'
          });
        } else if (apiError?.status === 404) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Nie znaleziono polisy',
            severity: 'error'
          });
        } else if (apiError?.status === 403) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Brak uprawnień do podglądu polisy',
            severity: 'error'
          });
        } else {
          addToast({
            id: crypto.randomUUID(),
            message: 'Nie udało się pobrać danych polisy',
            severity: 'error'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [policyId, addToast, mapClientData, location.state]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = () => navigate('/app/policies');

  const handleArchive = () => setArchiveDialogOpen(true);

  const handleArchiveClose = () => setArchiveDialogOpen(false);

  const handleArchiveSuccess = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: `Polisa ${policyNumber} została zarchiwizowana`,
      severity: 'success'
    });
    navigate('/app/policies');
  }, [addToast, policyNumber, navigate]);

  // PolicyRecord for dialog
  const policyRecord: PolicyRecord | null = useMemo(
    () =>
      policyData
        ? {
            id: policyData.id,
            client: clientName,
            insurance_company: insurerName,
            number: policyData.number,
            type: '',
            date_range: `${policyData.date_from} - ${policyData.date_to}`,
            city: policyData.city,
            status: ''
          }
        : null,
    [policyData, clientName, insurerName]
  );

  // Status color helper
  const statusColor = useMemo(() => {
    const s = clientData?.status?.toLowerCase() || '';
    if (s === 'pełny' || s === 'pelny') return 'success';
    if (s === 'podstawowy') return 'warning';
    return 'default';
  }, [clientData?.status]);

  // ---------------------------------------------------------------------------
  // Permission gate
  // ---------------------------------------------------------------------------

  if (!hasPermission('policy view-list')) {
    return (
      <Box component="main" pb={4}>
        <ListPlaceholderLayout title="Karta polisy">
          <NoAccessContent />
        </ListPlaceholderLayout>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading / empty states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Ładowanie danych polisy...</Typography>
      </Box>
    );
  }

  if (!policyData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Nie znaleziono polisy</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Wróć do listy
        </Button>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Unavailable tab content
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Dane klienta tab content
  // ---------------------------------------------------------------------------

  const ClientDataDesktop = () => {
    if (!clientData) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Ładowanie danych klienta...</Typography>
        </Box>
      );
    }

    return (
      <>
        {/* Title + Status + Edit */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            sx={{
              fontSize: '24px',
              fontWeight: 300,
              color: '#32343A',
              lineHeight: 1.334
            }}
          >
            Dane klienta
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            {clientData.status && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ color: '#74767F' }}>
                  Status klienta:
                </Typography>
                <Chip
                  label={clientData.status}
                  size="small"
                  color={statusColor as 'success' | 'warning' | 'default'}
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              </Stack>
            )}
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={() => navigate(`/app/clients/${clientData.id}`)}
              sx={{
                borderColor: '#494B54',
                color: '#494B54',
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#32343A',
                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Edytuj
            </Button>
          </Stack>
        </Stack>

        {/* Section 1: Dane rejestracyjne klienta */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)'
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'rgba(143, 109, 95, 0.12)',
                pb: 0.75,
                px: 1.5,
                mb: 2
              }}
            >
              <Typography
                sx={{
                  fontWeight: 400,
                  color: '#1E1F21',
                  fontSize: '16px',
                  lineHeight: 1.75,
                  letterSpacing: '0.15px'
                }}
              >
                Dane rejestracyjne klienta:
              </Typography>
            </Stack>
            <Box sx={{ px: 0 }}>
              <Stack direction="row">
                <FieldItem label="Nazwa firmy" value={clientData.name} />
                <FieldItem label="NIP" value={clientData.nip} />
                <FieldItem label="REGON" value={clientData.regon} />
                <FieldItem label="KRS" value={clientData.krs} />
                <FieldItem
                  label="Nr konta bankowego do wypłaty odszkodowania"
                  value={clientData.bank_account}
                />
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Section 2: Dane adresowe i kontaktowe */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)'
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'rgba(143, 109, 95, 0.12)',
                pb: 0.75,
                px: 1.5,
                mb: 2
              }}
            >
              <Typography
                sx={{
                  fontWeight: 400,
                  color: '#1E1F21',
                  fontSize: '16px',
                  lineHeight: 1.75,
                  letterSpacing: '0.15px'
                }}
              >
                Dane adresowe i kontaktowe:
              </Typography>
            </Stack>
            <Box sx={{ px: 0 }}>
              <Stack direction="row">
                <FieldItem label="Miasto" value={clientData.city} />
                <FieldItem label="Kod pocztowy" value={clientData.postal} />
                <FieldItem label="Nazwa ulicy" value={clientData.street} />
                <FieldItem label="Numer budynku/lokalu" value={clientData.street_no} />
                <FieldItem label="Numer telefonu" value={clientData.phone} />
                <FieldItem label="Strona internetowa" value={clientData.website} />
                <FieldItem label="E-mail" value={clientData.email} />
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {/* Section 3: Powiązania */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)'
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'rgba(143, 109, 95, 0.12)',
                pb: 0.75,
                px: 1.5,
                mb: 2
              }}
            >
              <Typography
                sx={{
                  fontWeight: 400,
                  color: '#1E1F21',
                  fontSize: '16px',
                  lineHeight: 1.75,
                  letterSpacing: '0.15px'
                }}
              >
                Powiązania:
              </Typography>
            </Stack>
            <Box sx={{ px: 0 }}>
              <Stack direction="row">
                <FieldItem label="Podmiot zarządzający" value={clientData.parent_client} />
                <Box sx={{ flex: 1, p: 1.5 }}>
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
                    Podmiot zależny
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#32343A',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: 1.57,
                        letterSpacing: '0.1px'
                      }}
                    >
                      {clientData.child_client || '-'}
                    </Typography>
                    {clientData.child_client_names.length > 1 && (
                      <Tooltip
                        title={
                          <Box>
                            {clientData.child_client_names.map((item, i) => (
                              <Typography key={i} variant="body2" sx={{ fontSize: '13px' }}>
                                {item}
                              </Typography>
                            ))}
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <InfoOutlinedIcon
                          sx={{
                            fontSize: 16,
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            '&:hover': { color: '#6B7280' }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
                {/* Spacers for grid alignment */}
                <Box sx={{ flex: 1, p: 1.5 }} />
                <Box sx={{ flex: 1, p: 1.5 }} />
                <Box sx={{ flex: 1, p: 1.5 }} />
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Mobile collapsible section header
  // ---------------------------------------------------------------------------

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
      <Typography
        sx={{
          fontWeight: 500,
          color: '#32343A',
          fontSize: '14px',
          lineHeight: 1.57,
          letterSpacing: '0.1px'
        }}
      >
        {title}
      </Typography>
      <IconButton size="small" onClick={onToggle}>
        <ExpandMoreIcon
          sx={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        />
      </IconButton>
    </Stack>
  );

  const ClientDataMobile = () => {
    if (!clientData) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Ładowanie danych klienta...</Typography>
        </Box>
      );
    }

    return (
      <>
        {/* "Dane klienta" top label */}
        <Box sx={{ px: 1 }}>
          <Box
            sx={{
              bgcolor: 'rgba(143, 109, 95, 0.08)',
              borderRadius: '8px',
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <PersonOutlineIcon sx={{ fontSize: 20, color: '#7A5D51' }} />
            <Typography
              sx={{
                color: '#7A5D51',
                fontSize: '16px',
                lineHeight: 1.75,
                letterSpacing: '0.15px'
              }}
            >
              Dane klienta
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 1 }}>
          <Card
            sx={{
              borderRadius: '8px',
              boxShadow: 'none',
              border: '1px solid rgba(143, 109, 95, 0.12)',
              p: 2
            }}
          >
            <Stack spacing={1}>
              {/* Dane rejestracyjne */}
              <MobileSectionHeader
                title="Dane rejestracyjne klienta"
                open={registrationOpen}
                onToggle={() => setRegistrationOpen((v) => !v)}
              />
              <Collapse in={registrationOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Nazwa firmy" value={clientData.name} />
                  <MobileFieldRow label="NIP" value={clientData.nip} />
                  <MobileFieldRow label="REGON" value={clientData.regon} />
                  <MobileFieldRow label="KRS" value={clientData.krs} />
                  <MobileFieldRow label="Nr konta bankowego" value={clientData.bank_account} />
                  <MobileFieldRow label="Strona internetowa" value={clientData.website} />
                </Stack>
              </Collapse>

              {/* Dane adresowe */}
              <MobileSectionHeader
                title="Dane adresowe i kontaktowe"
                open={addressOpen}
                onToggle={() => setAddressOpen((v) => !v)}
              />
              <Collapse in={addressOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Miasto" value={clientData.city} />
                  <MobileFieldRow label="Kod pocztowy" value={clientData.postal} />
                  <MobileFieldRow label="Nazwa ulicy" value={clientData.street} />
                  <MobileFieldRow label="Numer budynku/lokalu" value={clientData.street_no} />
                  <MobileFieldRow label="Numer telefonu" value={clientData.phone} />
                  <MobileFieldRow label="E-mail" value={clientData.email} />
                </Stack>
              </Collapse>

              {/* Powiązania */}
              <MobileSectionHeader
                title="Powiązania"
                open={relationsOpen}
                onToggle={() => setRelationsOpen((v) => !v)}
              />
              <Collapse in={relationsOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Podmiot zarządzający" value={clientData.parent_client} />
                  <MobileFieldRow label="Podmiot zależny" value={clientData.child_client} />
                </Stack>
              </Collapse>
            </Stack>
          </Card>
        </Box>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // MOBILE VIEW
  // ---------------------------------------------------------------------------

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
        {/* Mobile header */}
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
                {clientName || 'Polisa'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: '#74767F',
                  lineHeight: 1.43
                }}
              >
                {insurerName && `Ubezpieczyciel: `}
                {insurerName && (
                  <Typography
                    component="span"
                    sx={{ fontWeight: 600, fontSize: '13px', color: '#32343A' }}
                  >
                    {insurerName}
                  </Typography>
                )}
                {insurerName && policyNumber && '  '}
                {policyNumber && `Karta polisy: `}
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

        {/* Tabs */}
        <Box sx={{ px: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
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
            {POLICY_TABS.map((tab) => (
              <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        {activeTab === 0 ? <ClientDataMobile /> : <UnavailableTabContent />}

        {/* Mobile action buttons */}
        {activeTab === 0 && (
          <Stack direction="row" spacing={2} sx={{ px: 2, mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
              onClick={handleArchive}
              sx={{
                borderColor: '#D0D5DD',
                color: '#1E1F21',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none'
              }}
            >
              Usuń polisę
            </Button>
          </Stack>
        )}

        {/* Dialogs */}
        <ArchivePolicyDialog
          open={archiveDialogOpen}
          onClose={handleArchiveClose}
          policy={policyRecord}
          onSuccess={handleArchiveSuccess}
        />
      </Stack>
    );
  }

  // ---------------------------------------------------------------------------
  // DESKTOP VIEW
  // ---------------------------------------------------------------------------

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
      {/* Header */}
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
            {clientName || 'Polisa'}
          </Typography>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleArchive}
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
              Usuń polisę
            </Button>
          </Stack>
        </Stack>

        {/* Subtitle: Ubezpieczyciel + Karta polisy */}
        <Typography
          sx={{
            fontSize: '16px',
            color: '#74767F',
            lineHeight: 1.5
          }}
        >
          {insurerName && 'Ubezpieczyciel: '}
          {insurerName && (
            <Typography
              component="span"
              sx={{ fontWeight: 600, fontSize: '16px', color: '#32343A' }}
            >
              {insurerName}
            </Typography>
          )}
          {insurerName && policyNumber && '  '}
          {policyNumber && 'Karta polisy: '}
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
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
            '&.Mui-disabled': {
              display: 'none'
            }
          }}
        >
          {POLICY_TABS.map((tab) => (
            <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 0 ? (
          <Stack spacing={3}>
            <ClientDataDesktop />
          </Stack>
        ) : (
          <UnavailableTabContent />
        )}
      </Box>

      {/* Dialogs */}
      <ArchivePolicyDialog
        open={archiveDialogOpen}
        onClose={handleArchiveClose}
        policy={policyRecord}
        onSuccess={handleArchiveSuccess}
      />
    </Stack>
  );
};

export default PolicyDetailsPage;
