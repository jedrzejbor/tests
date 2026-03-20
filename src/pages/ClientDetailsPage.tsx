import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import EditClientDialog from '@/components/dialogs/EditClientDialog';
import ArchiveClientDialog from '@/components/dialogs/ArchiveClientDialog';
import {
  type ClientRecord,
  type ClientDetailsApiClient,
  type ClientDetailsResponse,
  getClientDetails
} from '@/services/clientsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientDetailsData {
  id: string | number;
  name: string;
  nip: string;
  regon: string;
  krs: string;
  bank_account: string;
  website: string;
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

const CLIENT_TABS = [
  { label: 'Dane klienta', icon: <PersonOutlineIcon sx={{ fontSize: 18 }} /> },
  { label: 'Dokumenty', icon: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Polisy', icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Płatności składek', icon: <PaymentsOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Szkody', icon: <ReportProblemOutlinedIcon sx={{ fontSize: 18 }} /> },
  { label: 'Dodatkowe informacje', icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} /> }
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ClientDetailsPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const { addToast } = useUiStore();

  const [clientData, setClientData] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Mobile collapsible sections
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [addressOpen, setAddressOpen] = useState(true);
  const [relationsOpen, setRelationsOpen] = useState(true);

  // ---------------------------------------------------------------------------
  // Data mapping helpers
  // ---------------------------------------------------------------------------

  const mapFromStateClient = useCallback(
    (stateClient: ClientRecord): ClientDetailsData => ({
      id: stateClient.id || clientId || '',
      name: stateClient.name || '',
      nip: stateClient.nip || '',
      regon: '',
      krs: '',
      bank_account: '',
      website: '',
      city: stateClient.city || '',
      postal: '',
      street: '',
      street_no: '',
      phone: '',
      authority_scope: stateClient.authority_scope || '',
      type: stateClient.type || '',
      status: stateClient.status || '',
      parent_client: stateClient.parent_client || '',
      child_client: stateClient.child_client || '',
      child_client_names: []
    }),
    [clientId]
  );

  const mapFromApiClient = useCallback(
    (
      api: ClientDetailsApiClient,
      stateClient?: ClientRecord,
      responseMeta?: ClientDetailsResponse['meta']
    ): ClientDetailsData => {
      // Extract child client names from meta.columns.child_client.tooltip.content
      // Backend sends content as { "1": "Name1", "2": "Name2" } or an array
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
        id: api.id ?? stateClient?.id ?? clientId ?? '',
        name: api.name || stateClient?.name || '',
        nip: api.nip || '',
        regon: api.regon || '',
        krs: api.krs || '',
        bank_account: api.bank_account || '',
        website: api.website || '',
        city: api.city || '',
        postal: api.postal || '',
        street: api.street || '',
        street_no: api.street_no || '',
        phone: api.phone || '',
        authority_scope: api.authority_scope || '',
        type: api.type || '',
        status: api.status || stateClient?.status || '',
        parent_client:
          api.parent_client || api.parent_client_name || stateClient?.parent_client || '',
        child_client: api.child_client || api.child_client_name || stateClient?.child_client || '',
        child_client_names: childClientNames
      };
    },
    [clientId]
  );

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      const stateClient = (location.state as { client?: ClientRecord })?.client;

      try {
        if (stateClient) {
          setClientData(mapFromStateClient(stateClient));
        }

        if (!clientId) {
          if (!stateClient) setClientData(null);
          return;
        }

        const response = await getClientDetails(clientId);
        setClientData(mapFromApiClient(response.client, stateClient, response.meta));
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
            message: 'Nie znaleziono klienta',
            severity: 'error'
          });
          setClientData(null);
        } else if (apiError?.status === 403) {
          addToast({
            id: crypto.randomUUID(),
            message: 'Brak uprawnień do podglądu klienta',
            severity: 'error'
          });
          setClientData(null);
        } else {
          addToast({
            id: crypto.randomUUID(),
            message: 'Nie udało się pobrać danych klienta',
            severity: 'error'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId, addToast, mapFromStateClient, mapFromApiClient, location.state]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleBack = () => navigate('/app/clients');

  const handleEditClient = () => setEditDialogOpen(true);

  const handleEditDialogClose = () => setEditDialogOpen(false);

  const handleClientUpdated = useCallback(() => {
    addToast({
      id: crypto.randomUUID(),
      message: 'Dane klienta zostały zaktualizowane',
      severity: 'success'
    });

    // Re-fetch
    if (clientId) {
      getClientDetails(clientId).then((response) => {
        const stateClient = (location.state as { client?: ClientRecord })?.client;
        setClientData(mapFromApiClient(response.client, stateClient, response.meta));
      });
    }
  }, [addToast, clientId, location.state, mapFromApiClient]);

  const handleDeleteClient = () => setDeleteDialogOpen(true);

  const handleDeleteDialogClose = () => setDeleteDialogOpen(false);

  const handleClientDeleted = useCallback(() => {
    if (!clientData) return;
    addToast({
      id: crypto.randomUUID(),
      message: `Klient ${clientData.name} został zarchiwizowany`,
      severity: 'success'
    });
    navigate('/app/clients');
  }, [clientData, addToast, navigate]);

  // Convert to ClientRecord for dialogs
  const clientRecord: ClientRecord | null = clientData
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
    : null;

  // ---------------------------------------------------------------------------
  // Loading / empty states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Ładowanie danych klienta...</Typography>
      </Box>
    );
  }

  if (!clientData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Nie znaleziono klienta</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Wróć do listy
        </Button>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab content — only tab 0 is functional
  // ---------------------------------------------------------------------------

  const UnavailableTabContent = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 3
      }}
    >
      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
        Funkcjonalność jeszcze niedostępna
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Ta sekcja zostanie udostępniona w przyszłej wersji aplikacji.
      </Typography>
    </Box>
  );

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
        {/* Mobile header: arrow + name */}
        <Box sx={{ borderBottom: '1px solid #D0D5DD', py: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5 }}>
            <IconButton onClick={handleBack} sx={{ borderRadius: '8px', p: 1 }}>
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 300,
                color: '#32343A',
                lineHeight: '32px',
                letterSpacing: '-0.4px'
              }}
            >
              {clientData.name}
            </Typography>
          </Stack>
        </Box>

        {/* Tabs — horizontal scrollable */}
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
            {CLIENT_TABS.map((tab) => (
              <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        {activeTab !== 0 ? (
          <Box sx={{ px: 1 }}>
            <UnavailableTabContent />
          </Box>
        ) : (
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

            {/* Main content card */}
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
                      <MobileFieldRow
                        label="Podmiot zarządzający"
                        value={clientData.parent_client}
                      />
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
                          Podmiot zależny
                        </Typography>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <Typography
                            sx={{ color: '#32343A', fontSize: '12px', lineHeight: '16px' }}
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
                                sx={{ fontSize: 16, color: '#9CA3AF', cursor: 'pointer' }}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Collapse>
                </Stack>
              </Card>
            </Box>

            {/* Mobile action buttons */}
            <Stack direction="row" spacing={2} sx={{ px: 2, mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={handleEditClient}
                sx={{
                  borderColor: '#494B54',
                  color: '#494B54',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none'
                }}
              >
                Edytuj
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
                onClick={handleDeleteClient}
                sx={{
                  borderColor: '#D0D5DD',
                  color: '#1E1F21',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none'
                }}
              >
                Usuń klienta
              </Button>
            </Stack>
          </>
        )}

        {/* Dialogs */}
        <EditClientDialog
          open={editDialogOpen}
          onClose={handleEditDialogClose}
          client={clientRecord}
          onSuccess={handleClientUpdated}
        />
        <ArchiveClientDialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          client={clientRecord}
          onSuccess={handleClientDeleted}
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
        height: '100%'
      }}
    >
      {/* Header: name + action buttons */}
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
          {clientData.name}
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDeleteClient}
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
            Usuń klienta
          </Button>
          {/* 'Wyślij powiadomienie' button removed per request */}
        </Stack>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
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
            }
          }}
        >
          {CLIENT_TABS.map((tab) => (
            <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      {activeTab !== 0 ? (
        <UnavailableTabContent />
      ) : (
        <>
          {/* Title + Edit button */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: 300,
                color: '#32343A',
                lineHeight: 1.334
              }}
            >
              Szczegółowe dane klienta:
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 20 }} />}
              onClick={handleEditClient}
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
                  <FieldItem label="Strona internetowa" value={clientData.website} />
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
                  <Box sx={{ flex: 1, p: 1.5 }} />
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <EditClientDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        client={clientRecord}
        onSuccess={handleClientUpdated}
      />
      <ArchiveClientDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        client={clientRecord}
        onSuccess={handleClientDeleted}
      />
    </Stack>
  );
};

export default ClientDetailsPage;
