import { FC, useCallback, useState, useMemo } from 'react';
import { Button, Card, CardHeader, NoDataCard } from '@/components/atoms';
import { FlexpriceTable, ColumnData, DropdownMenu, RolloutChargesModal, RolloutOption } from '@/components/molecules';
import { Price, Plan } from '@/models';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PriceApi } from '@/api/PriceApi';
import { PlanApi } from '@/api/PlanApi';
import SubscriptionApi from '@/api/SubscriptionApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { RouteNames } from '@/core/routes/Routes';
import { getPriceTypeLabel } from '@/utils';
import { BILLING_PERIOD } from '@/constants/constants';
import { ChargeValueCell } from '@/components/molecules';
import { formatInvoiceCadence } from '@/pages';
import { Dialog } from '@/components/ui';

// ===== TYPES & CONSTANTS =====

interface PlanChargesTableProps {
	plan: Plan;
	onPriceUpdate?: () => void;
}

const formatBillingPeriod = (billingPeriod: string) => {
	switch (billingPeriod.toUpperCase()) {
		case BILLING_PERIOD.DAILY:
			return 'Daily';
		case BILLING_PERIOD.WEEKLY:
			return 'Weekly';
		case BILLING_PERIOD.MONTHLY:
			return 'Monthly';
		case BILLING_PERIOD.ANNUAL:
			return 'Yearly';
		case BILLING_PERIOD.QUARTERLY:
			return 'Quarterly';
		case BILLING_PERIOD.HALF_YEARLY:
			return 'Half Yearly';
		default:
			return '--';
	}
};

const PlanPriceTable: FC<PlanChargesTableProps> = ({ plan, onPriceUpdate }) => {
	const navigate = useNavigate();
	const [showRolloutModal, setShowRolloutModal] = useState(false);
	const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);

	// ===== DATA FETCHING =====
	const { data: existingSubscriptions } = useQuery({
		queryKey: ['subscriptions', plan.id],
		queryFn: () =>
			SubscriptionApi.listSubscriptions({
				plan_id: plan.id,
				limit: 10,
			}),
		enabled: !!plan.id,
	});

	// ===== MUTATIONS =====
	const { mutateAsync: deletePrice, isPending: isDeletingPrice } = useMutation({
		mutationFn: async (priceId: string) => {
			return await PriceApi.DeletePrice(priceId);
		},
		onError: (error: ServerError) => {
			toast.error(error?.error?.message || 'Error deleting price');
		},
	});

	const { mutateAsync: syncPlanCharges, isPending: isSyncing } = useMutation({
		mutationFn: () => PlanApi.synchronizePlanPricesWithSubscription(plan.id),
		onError: (error: ServerError) => {
			toast.error(error?.error?.message || 'Error synchronizing charges with subscriptions');
		},
	});

	const isPending = isDeletingPrice || isSyncing;

	// ===== MEMOIZED VALUES =====
	const hasExistingSubscriptions = useMemo(() => {
		return existingSubscriptions?.items?.length && existingSubscriptions.items.length > 0;
	}, [existingSubscriptions]);

	// ===== HANDLERS =====
	const handleDeletePrice = useCallback(
		async (priceId: string) => {
			const price = plan.prices?.find((p) => p.id === priceId);
			if (!price) return;

			if (hasExistingSubscriptions) {
				// Show rollout modal for plans with existing subscriptions
				setSelectedPrice(price);
				setShowRolloutModal(true);
			} else {
				// For plans without subscriptions, delete directly
				try {
					await deletePrice(priceId);
					toast.success('Price deleted successfully');
					onPriceUpdate?.();
				} catch (error) {
					console.error('Error deleting price:', error);
				}
			}
		},
		[plan.prices, hasExistingSubscriptions, deletePrice, onPriceUpdate],
	);

	const handleRolloutConfirm = useCallback(
		async (option: RolloutOption) => {
			if (!selectedPrice) return;

			setShowRolloutModal(false);

			try {
				// Delete the price
				await deletePrice(selectedPrice.id);

				// If user selected to sync with existing subscriptions
				if (option === RolloutOption.EXISTING_ALSO) {
					await syncPlanCharges();
					toast.success('Sync has been started and will take up to 1 hour to complete');
				} else {
					// Only show delete success if no sync is happening
					toast.success('Price deleted successfully');
				}

				// Refresh data
				onPriceUpdate?.();
				setSelectedPrice(null);
			} catch (error) {
				console.error('Error in rollout process:', error);
			}
		},
		[selectedPrice, deletePrice, syncPlanCharges, onPriceUpdate],
	);

	const handleRolloutCancel = useCallback(() => {
		setShowRolloutModal(false);
		setSelectedPrice(null);
	}, []);

	// ===== TABLE COLUMNS =====
	const chargeColumns: ColumnData<Price>[] = [
		{
			title: 'Charge Type',
			render: (row) => {
				return <span>{getPriceTypeLabel(row.type)}</span>;
			},
		},
		{
			title: 'Feature',
			render(rowData) {
				return <span>{rowData.meter?.name ?? '--'}</span>;
			},
		},
		{
			title: 'Billing Timing',
			render(rowData) {
				return <span>{formatInvoiceCadence(rowData.invoice_cadence as string)}</span>;
			},
		},
		{
			title: 'Billing Period',
			render(rowData) {
				return <span>{formatBillingPeriod(rowData.billing_period as string)}</span>;
			},
		},
		{
			title: 'Value',
			render(rowData) {
				return <ChargeValueCell data={rowData} />;
			},
		},
		{
			fieldVariant: 'interactive',
			width: '30px',
			hideOnEmpty: true,
			render(row) {
				return (
					<DropdownMenu
						options={[
							{
								label: 'Terminate Price',
								icon: <Trash2 />,
								onSelect: () => handleDeletePrice(row.id),
							},
						]}
					/>
				);
			},
		},
	];

	// ===== RENDER =====
	return (
		<>
			{/* Rollout Charges Modal */}
			<Dialog open={showRolloutModal} onOpenChange={setShowRolloutModal}>
				<RolloutChargesModal onCancel={handleRolloutCancel} onConfirm={handleRolloutConfirm} isLoading={isPending} planName={plan.name} />
			</Dialog>

			{/* Charges Table */}
			{(plan?.prices?.length ?? 0) > 0 ? (
				<Card variant='notched'>
					<CardHeader
						title='Charges'
						cta={
							<Button prefixIcon={<Plus />} onClick={() => navigate(`${RouteNames.plan}/${plan.id}/add-charges`)}>
								Add
							</Button>
						}
					/>
					<FlexpriceTable columns={chargeColumns} data={plan?.prices ?? []} />
				</Card>
			) : (
				<NoDataCard
					title='Charges'
					subtitle='No charges added to the plan yet'
					cta={
						<Button prefixIcon={<Plus />} onClick={() => navigate(`${RouteNames.plan}/${plan.id}/add-charges`)}>
							Add
						</Button>
					}
				/>
			)}
		</>
	);
};

export default PlanPriceTable;
