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
  Divider,
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
  type SelectOption,
  getPolicyDetails,
  getPolicyFormOptions,
  downloadPolicyAttachment
} from '@/services/policiesService';
import {
  type ClientDetailsApiClient,
  type ClientDetailsResponse,
  type ClientRecord,
  getClientDetails
} from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import ListPlaceholderLayout from '@/components/ListPlaceholderLayout';
import NoAccessContent from '@/components/NoAccessContent';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArchivePolicyDialog from '@/components/dialogs/ArchivePolicyDialog';
import EditClientDialog from '@/components/dialogs/EditClientDialog';
import EditPolicyDialog from '@/components/dialogs/EditPolicyDialog';

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

  // Edit client dialog
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);

  // Edit policy dialog
  const [editPolicyDialogOpen, setEditPolicyDialogOpen] = useState(false);

  // Form options for resolving IDs to labels
  const [formOptions, setFormOptions] = useState<{
    clients: SelectOption[];
    insurance_companies: SelectOption[];
    policy_types: SelectOption[];
  } | null>(null);

  // Mobile collapsible sections (for "Dane klienta" tab)
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [addressOpen, setAddressOpen] = useState(true);
  const [relationsOpen, setRelationsOpen] = useState(true);

  // Mobile collapsible sections (for "Dane polisy" tab)
  const [policyInfoOpen, setPolicyInfoOpen] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(true);
  const [extraInfoOpen, setExtraInfoOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);

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

        // 2. Fetch client details + form options in parallel
        const promises: Promise<void>[] = [];

        if (policy.client_id) {
          promises.push(
            getClientDetails(policy.client_id)
              .then((clientResponse) => {
                setClientData(mapClientData(clientResponse.client, clientResponse.meta));
                setClientName(clientResponse.client.name || statePolicy?.client || '');
              })
              .catch(() => {
                // Client fetch failed — we still show what we have
              })
          );
        }

        promises.push(
          getPolicyFormOptions()
            .then((opts) => {
              setFormOptions(opts);
              // Resolve insurer name from options if not from state
              if (!statePolicy?.insurance_company && policy.insurance_company_id) {
                const found = opts.insurance_companies?.find(
                  (o) => o.value === policy.insurance_company_id
                );
                if (found) setInsurerName(found.label);
              }
            })
            .catch(() => {
              // Form options fetch failed — non-critical
            })
        );

        await Promise.all(promises);
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

  // ClientRecord for EditClientDialog
  const clientRecord: ClientRecord | null = useMemo(
    () =>
      clientData
        ? {
            id: clientData.id,
            name: clientData.name,
            parent_client: clientData.parent_client,
            child_client: clientData.child_client,
            type: clientData.type,
            status: clientData.status,
            authority_scope: clientData.authority_scope,
            nip: clientData.nip,
            city: clientData.city
          }
        : null,
    [clientData]
  );

  const handleClientUpdated = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: 'Dane klienta zostały zaktualizowane',
      severity: 'success'
    });
    // Re-fetch client data
    if (policyData?.client_id) {
      getClientDetails(policyData.client_id)
        .then((res) => {
          setClientData(mapClientData(res.client, res.meta));
          setClientName(res.client.name || clientName);
        })
        .catch((err: unknown) => {
          void err; // silent — toast already shown by EditClientDialog
        });
    }
  }, [addToast, policyData?.client_id, mapClientData, clientName]);

  const handlePolicyUpdated = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: 'Dane polisy zostały zaktualizowane',
      severity: 'success'
    });
    // Re-fetch policy data
    if (policyId) {
      getPolicyDetails(policyId)
        .then((res) => {
          setPolicyData(res.policy);
          setPolicyNumber(res.policy.number || policyNumber);
        })
        .catch((err: unknown) => {
          void err;
        });
    }
  }, [addToast, policyId, policyNumber]);

  const handleDownloadAttachment = useCallback(async () => {
    if (!policyData?.attachment) return;
    try {
      await downloadPolicyAttachment(policyData.attachment);
    } catch {
      addToast({
        id: crypto.randomUUID(),
        message: 'Nie udało się pobrać załącznika',
        severity: 'error'
      });
    }
  }, [addToast, policyData?.attachment]);

  // Resolved names from form options
  const insurerLabel = useMemo(() => {
    if (!policyData || !formOptions) return insurerName;
    return (
      formOptions.insurance_companies?.find((o) => o.value === policyData.insurance_company_id)
        ?.label || insurerName
    );
  }, [policyData, formOptions, insurerName]);

  const policyTypeLabel = useMemo(() => {
    if (!policyData || !formOptions) return '';
    return (
      formOptions.policy_types?.find((o) => o.value === policyData.policy_type_id)?.label || ''
    );
  }, [policyData, formOptions]);

  // Status color helper
  const statusColor = useMemo(() => {
    const s = clientData?.status?.toLowerCase() || '';
    if (s === 'pełny' || s === 'pelny') return 'success';
    if (s === 'podstawowy') return 'warning';
    return 'default';
  }, [clientData?.status]);

  const policyStatusColor = useMemo(() => {
    // Placeholder — extend when backend provides policy status
    return 'success' as const;
  }, []);

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
              onClick={() => setEditClientDialogOpen(true)}
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
  // Helper: format ISO date to DD.MM.YYYY
  // ---------------------------------------------------------------------------
  const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return '-';
    const d = iso.slice(0, 10); // YYYY-MM-DD
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  };

  // ---------------------------------------------------------------------------
  // Helper: format PLN string for display
  // ---------------------------------------------------------------------------
  const formatPln = (val: string | null | undefined): string => {
    if (!val) return '-';
    // Already formatted from backend (e.g. "2000,00 zł")
    if (/zł|PLN/i.test(val)) return val.replace(/zł/i, 'PLN').trim();
    // Raw number
    const num = parseFloat(val.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(num)) return val;
    return (
      num.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN'
    );
  };

  // ---------------------------------------------------------------------------
  // Dane polisy tab content — DESKTOP
  // ---------------------------------------------------------------------------

  const PolicyDataDesktop = () => {
    if (!policyData) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Brak danych polisy</Typography>
        </Box>
      );
    }

    const clauseLabels: string[] = [];
    if (policyData.first_update_clause_of_su)
      clauseLabels.push('Klauzulę pierwszej aktualizacji SU');
    if (policyData.automatic_coverage_clause) clauseLabels.push('Dodaj składkę');
    if (policyData.current_assets_settlement_clause)
      clauseLabels.push('Klauzulę rozliczenia aktualnych aktywów');

    // Resolve payment schedule deadline & final premium
    const payments = policyData.payments || [];
    const lastPaymentDate =
      payments.length > 0 ? formatDate(payments[payments.length - 1].payment_date) : '-';
    const lastPaymentAmount =
      payments.length > 0 ? formatPln(payments[payments.length - 1].payment_total) : '-';

    return (
      <>
        {/* Header: title + status + edit */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, pt: 2 }}
        >
          <Typography sx={{ fontSize: '20px', fontWeight: 500, color: '#32343A' }}>
            Dane polisy
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ color: '#74767F' }}>
                Status polisy:
              </Typography>
              <Chip
                label="Aktywna"
                size="small"
                color={policyStatusColor}
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Stack>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={() => setEditPolicyDialogOpen(true)}
              sx={{
                borderColor: '#494B54',
                color: '#494B54',
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': { borderColor: '#32343A', bgcolor: 'rgba(0, 0, 0, 0.04)' }
              }}
            >
              Edytuj
            </Button>
          </Stack>
        </Stack>

        {/* Section: Polisa */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mx: 3
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
              Polisa:
            </Typography>
            <Stack direction="row">
              <FieldItem label="Ubezpieczyciel" value={insurerLabel} />
              <FieldItem label="Typ polisy" value={policyTypeLabel} />
              {policyData.car_plates && (
                <FieldItem label="Nr rejestracyjny" value={policyData.car_plates} />
              )}
              <FieldItem label="Numer polisy" value={policyData.number} />
              <FieldItem
                label="Okres obowiązywania"
                value={`${formatDate(policyData.date_from)}- ${formatDate(policyData.date_to)}`}
              />
              <FieldItem label="Opis" value={policyData.description || '-'} />
            </Stack>
          </CardContent>
        </Card>

        {/* Section: Składki */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mx: 3
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
              Składki:
            </Typography>
            <Stack direction="row" sx={{ mb: 2 }}>
              <FieldItem label="Składka łączna" value={formatPln(policyData.payment_total)} />
              <FieldItem label="Ilość rat" value={String(policyData.payments_count || '-')} />
              <FieldItem
                label="Procent prowizji"
                value={
                  policyData.margin_percent ? `${parseFloat(policyData.margin_percent)}%` : '-'
                }
              />
            </Stack>

            {/* Individual payment rows */}
            {payments.map((pm, idx) => (
              <Stack key={pm.id} direction="row" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#32343A',
                    fontWeight: 500,
                    width: 24,
                    pt: 1.5
                  }}
                >
                  {idx + 1}.
                </Typography>
                <FieldItem
                  label={`Termin ${idx === 0 ? 'pierwszej' : idx === 1 ? 'drugiej' : `${idx + 1}.`} składki`}
                  value={formatDate(pm.payment_date)}
                />
                <FieldItem
                  label={`Wartość ${idx === 0 ? 'pierwszej' : idx === 1 ? 'drugiej' : `${idx + 1}.`} składki`}
                  value={formatPln(pm.payment_total)}
                />
              </Stack>
            ))}
          </CardContent>
        </Card>

        {/* Section: Dodatkowe informacje */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mx: 3
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
              Dodatkowe informacje:
            </Typography>
            <Stack direction="row">
              <FieldItem
                label="Polisa zawiera"
                value={clauseLabels.length > 0 ? clauseLabels.join(', ') : '-'}
              />
              <FieldItem
                label="Edycja zapisów umowy"
                value={policyData.automatic_coverage_clause ? 'Dodaj składkę' : '-'}
              />
              <FieldItem label="Wartość składki" value={formatPln(policyData.payment_total)} />
              <FieldItem label="Termin spłaty składek" value={lastPaymentDate} />
              <FieldItem label="Składka końcowa" value={lastPaymentAmount} />
            </Stack>
          </CardContent>
        </Card>

        {/* Section: Załączniki */}
        <Card
          sx={{
            borderRadius: 1,
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'rgba(143, 109, 95, 0.12)',
            mx: 3,
            mb: 2
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography sx={{ fontWeight: 600, color: '#32343A', fontSize: '15px' }}>
                Załączniki
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderColor: '#D0D5DD',
                  color: '#494B54',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: '13px'
                }}
              >
                Dodaj
              </Button>
            </Stack>
            {policyData.attachment ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <AttachFileIcon sx={{ fontSize: 18, color: '#74767F' }} />
                <Typography
                  onClick={handleDownloadAttachment}
                  sx={{
                    fontSize: '14px',
                    color: '#32343A',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Załącznik 1
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: '#74767F' }}>
                Brak załączników
              </Typography>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Dane polisy tab content — MOBILE
  // ---------------------------------------------------------------------------

  const PolicyDataMobile = () => {
    if (!policyData) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Brak danych polisy</Typography>
        </Box>
      );
    }

    const payments = policyData.payments || [];

    return (
      <>
        <Box sx={{ px: 1 }}>
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'rgba(143, 109, 95, 0.08)',
              borderRadius: '8px',
              p: 1.5,
              mb: 1
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 500, color: '#32343A', fontSize: '15px' }}>
                Dane polisy
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label="Aktywna"
                  size="small"
                  color={policyStatusColor}
                  variant="outlined"
                  sx={{ fontWeight: 500, fontSize: '12px' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setEditPolicyDialogOpen(true)}
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
            </Stack>
          </Box>

          {/* Polisa section */}
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
                title="Polisa"
                open={policyInfoOpen}
                onToggle={() => setPolicyInfoOpen((v) => !v)}
              />
              <Collapse in={policyInfoOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow label="Ubezpieczyciel" value={insurerLabel} />
                  <MobileFieldRow label="Typ polisy" value={policyTypeLabel} />
                  {policyData.car_plates && (
                    <MobileFieldRow label="Nr rejestracyjny" value={policyData.car_plates} />
                  )}
                  <MobileFieldRow label="Numer polisy" value={policyData.number} />
                  <MobileFieldRow
                    label="Okres"
                    value={`${formatDate(policyData.date_from)} - ${formatDate(policyData.date_to)}`}
                  />
                  <MobileFieldRow label="Opis" value={policyData.description || '-'} />
                </Stack>
              </Collapse>

              <Divider sx={{ my: 0.5 }} />

              <MobileSectionHeader
                title="Składki"
                open={paymentsOpen}
                onToggle={() => setPaymentsOpen((v) => !v)}
              />
              <Collapse in={paymentsOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow
                    label="Składka łączna"
                    value={formatPln(policyData.payment_total)}
                  />
                  <MobileFieldRow
                    label="Ilość rat"
                    value={String(policyData.payments_count || '-')}
                  />
                  <MobileFieldRow
                    label="Prowizja"
                    value={
                      policyData.margin_percent ? `${parseFloat(policyData.margin_percent)}%` : '-'
                    }
                  />
                  {payments.map((pm, idx) => (
                    <React.Fragment key={pm.id}>
                      <MobileFieldRow
                        label={`Termin składki ${idx + 1}`}
                        value={formatDate(pm.payment_date)}
                      />
                      <MobileFieldRow
                        label={`Wartość składki ${idx + 1}`}
                        value={formatPln(pm.payment_total)}
                      />
                    </React.Fragment>
                  ))}
                </Stack>
              </Collapse>

              <Divider sx={{ my: 0.5 }} />

              <MobileSectionHeader
                title="Dodatkowe informacje"
                open={extraInfoOpen}
                onToggle={() => setExtraInfoOpen((v) => !v)}
              />
              <Collapse in={extraInfoOpen}>
                <Stack sx={{ pb: 1 }}>
                  <MobileFieldRow
                    label="Polisa zawiera"
                    value={
                      [
                        policyData.first_update_clause_of_su &&
                          'Klauzulę pierwszej aktualizacji SU',
                        policyData.automatic_coverage_clause && 'Dodaj składkę',
                        policyData.current_assets_settlement_clause &&
                          'Klauzulę rozliczenia aktualnych aktywów'
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'
                    }
                  />
                  <MobileFieldRow
                    label="Wartość składki"
                    value={formatPln(policyData.payment_total)}
                  />
                </Stack>
              </Collapse>

              <Divider sx={{ my: 0.5 }} />

              <MobileSectionHeader
                title="Załączniki"
                open={attachmentsOpen}
                onToggle={() => setAttachmentsOpen((v) => !v)}
              />
              <Collapse in={attachmentsOpen}>
                <Stack sx={{ pb: 1 }}>
                  {policyData.attachment ? (
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 1, px: 0.5 }}
                    >
                      <Typography sx={{ fontSize: '13px', color: '#74767F' }}>
                        Załącznik 1
                      </Typography>
                      <Typography
                        onClick={handleDownloadAttachment}
                        sx={{
                          fontSize: '13px',
                          color: '#32343A',
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        Pobierz
                      </Typography>
                    </Stack>
                  ) : (
                    <MobileFieldRow label="Brak załączników" value="" />
                  )}
                </Stack>
              </Collapse>
            </CardContent>
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
        {activeTab === 0 ? (
          <ClientDataMobile />
        ) : activeTab === 2 ? (
          <PolicyDataMobile />
        ) : (
          <UnavailableTabContent />
        )}

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
        <EditClientDialog
          open={editClientDialogOpen}
          onClose={() => setEditClientDialogOpen(false)}
          client={clientRecord}
          onSuccess={handleClientUpdated}
        />
        <EditPolicyDialog
          open={editPolicyDialogOpen}
          onClose={() => setEditPolicyDialogOpen(false)}
          policy={policyRecord}
          onSuccess={handlePolicyUpdated}
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
            '& .Mui-disabled': {
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
        ) : activeTab === 2 ? (
          <Stack spacing={3}>
            <PolicyDataDesktop />
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
      <EditClientDialog
        open={editClientDialogOpen}
        onClose={() => setEditClientDialogOpen(false)}
        client={clientRecord}
        onSuccess={handleClientUpdated}
      />
      <EditPolicyDialog
        open={editPolicyDialogOpen}
        onClose={() => setEditPolicyDialogOpen(false)}
        policy={policyRecord}
        onSuccess={handlePolicyUpdated}
      />
    </Stack>
  );
};

export default PolicyDetailsPage;
