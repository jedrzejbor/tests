import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { GenericListView } from '@/components/lists';
import ArchivePaymentDialog from '@/components/dialogs/ArchivePaymentDialog';
import EditPaymentDialog from '@/components/dialogs/EditPaymentDialog';
import ForceDeletePaymentDialog from '@/components/dialogs/ForceDeletePaymentDialog';
import ViewPaymentDialog from '@/components/dialogs/ViewPaymentDialog';
import { fetchPaymentsTable, restorePayment, type PaymentRecord } from '@/services/paymentsService';
import type { ApiError } from '@/services/apiClient';
import { useUiStore } from '@/store/uiStore';

const PaymentsPage: React.FC = () => {
  const { addToast } = useUiStore();

  const [viewPaymentDialogOpen, setViewPaymentDialogOpen] = useState(false);
  const [editPaymentDialogOpen, setEditPaymentDialogOpen] = useState(false);
  const [archivePaymentDialogOpen, setArchivePaymentDialogOpen] = useState(false);
  const [forceDeletePaymentDialogOpen, setForceDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewPayment = useCallback((row: PaymentRecord) => {
    setSelectedPayment(row);
    setViewPaymentDialogOpen(true);
  }, []);

  const handleEditPayment = useCallback((row: PaymentRecord) => {
    setSelectedPayment(row);
    setEditPaymentDialogOpen(true);
  }, []);

  const handleArchivePayment = useCallback((row: PaymentRecord) => {
    setSelectedPayment(row);
    setArchivePaymentDialogOpen(true);
  }, []);

  const handleForceDeletePayment = useCallback((row: PaymentRecord) => {
    setSelectedPayment(row);
    setForceDeletePaymentDialogOpen(true);
  }, []);

  const handleRestorePayment = useCallback(
    async (row: PaymentRecord) => {
      if (!row.id) return;

      try {
        await restorePayment(row.id);
        addToast({
          id: crypto.randomUUID(),
          message: 'Płatność została przywrócona',
          severity: 'success'
        });
        setRefreshKey((key) => key + 1);
      } catch (error) {
        const apiError = error as ApiError;
        addToast({
          id: crypto.randomUUID(),
          message: apiError?.message || 'Nie udało się przywrócić płatności',
          severity: 'error'
        });
      }
    },
    [addToast]
  );

  const handlePaymentSuccess = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const handlers = useMemo(
    () => ({
      'view-payments': handleViewPayment,
      'edit-payments': handleEditPayment,
      'archive-payments': handleArchivePayment,
      'delete-payments': handleForceDeletePayment,
      'restore-payments': handleRestorePayment
    }),
    [
      handleViewPayment,
      handleEditPayment,
      handleArchivePayment,
      handleForceDeletePayment,
      handleRestorePayment
    ]
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <GenericListView<PaymentRecord>
        title="Płatności składek"
        fetcher={fetchPaymentsTable}
        handlers={handlers}
        rowKey={(row) => String(row.id || row.policy_number)}
        initialPerPage={10}
        refreshKey={refreshKey}
        stateKey="/app/payments"
        disabledGeneralActions={['payments-create']}
      />

      <ViewPaymentDialog
        open={viewPaymentDialogOpen}
        onClose={() => {
          setViewPaymentDialogOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />

      <EditPaymentDialog
        open={editPaymentDialogOpen}
        onClose={() => {
          setEditPaymentDialogOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />

      <ArchivePaymentDialog
        open={archivePaymentDialogOpen}
        onClose={() => {
          setArchivePaymentDialogOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />

      <ForceDeletePaymentDialog
        open={forceDeletePaymentDialogOpen}
        onClose={() => {
          setForceDeletePaymentDialogOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />
    </Box>
  );
};

export default PaymentsPage;
