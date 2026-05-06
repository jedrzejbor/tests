import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ClaimPasswordDialog from '@/components/dialogs/ClaimPasswordDialog';
import { getClaimDetails, type ClaimRecord, type ClaimResource } from '@/services/claimsService';
import { usePermission } from '@/hooks/usePermission';

const CLAIM_TABS = [
  'Dane szkody',
  'Dokumentacja urzędowa',
  'Dokumentacja przesyłana do ZU',
  'Dokumentacja szkodowa',
  'Decyzja',
  'Osoby kontaktowe'
];

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

  const handleBack = () => {
    navigate('/app/damages');
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

        <UnavailableTabContent />

        <Stack direction="row" spacing={2} sx={{ px: 2, mt: 1 }}>
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
        <UnavailableTabContent />
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
