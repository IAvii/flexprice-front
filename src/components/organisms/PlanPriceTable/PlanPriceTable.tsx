import React, { FC, useCallback, useState, useMemo } from 'react';
import { Button, Card, CardHeader, NoDataCard, Chip, Tooltip } from '@/components/atoms';
import { FlexpriceTable, ColumnData, DropdownMenu, TerminatePriceModal, SyncOption, UpdatePriceDialog } from '@/components/molecules';
import { Price, Plan, PRICE_STATUS } from '@/models';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { PriceApi } from '@/api/PriceApi';
import { PlanApi } from '@/api/PlanApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import { getPriceTypeLabel } from '@/utils';
import { BILLING_PERIOD } from '@/constants/constants';
import { ChargeValueCell } from '@/components/molecules';
import { formatInvoiceCadence } from '@/pages';
import { Dialog } from '@/components/ui';
import { DeletePriceRequest } from '@/types/dto';
import { formatDateTimeWithSecondsAndTimezone } from '@/utils/common/format_date';

// ===== TYPES & CONSTANTS =====

interface PlanChargesTableProps {
	plan: Plan;
	onPriceUpdate?: () => void;
}

interface PriceWithStatus extends Price {
	precomputedStatus: PRICE_STATUS;
	statusVariant: 'info' | 'default' | 'success';
	statusLabel: string;
	tooltipContent: React.ReactNode;
}

interface PriceDropdownProps {
	row: Price;
	hasEndDate: boolean;
	onEditPrice: (price: Price) => void;
	onTerminatePrice: (priceId: string) => void;
}

const PriceDropdown: FC<PriceDropdownProps> = ({ row, hasEndDate, onEditPrice, onTerminatePrice }) => {
	const [isOpen, setIsOpen] = useState(false);

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsOpen(!isOpen);
	};

	return (
		<div data-interactive='true' onClick={handleClick}>
			<DropdownMenu
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				options={[
					{
						label: 'Edit Price',
						icon: <Pencil />,
						onSelect: (e: Event) => {
							e.preventDefault();
							setIsOpen(false);
							onEditPrice(row);
						},
						disabled: hasEndDate,
					},
					{
						label: 'Terminate Price',
						icon: <Trash2 />,
						onSelect: (e: Event) => {
							e.preventDefault();
							setIsOpen(false);
							onTerminatePrice(row.id);
						},
						disabled: hasEndDate,
					},
				]}
			/>
		</div>
	);
};

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

const getPriceStatus = (price: Price): PRICE_STATUS => {
	const now = new Date();

	// Check if start_date is in the future
	if (price.start_date && price.start_date.trim() !== '') {
		const startDate = new Date(price.start_date);
		// Check if date is valid (not NaN)
		if (!isNaN(startDate.getTime()) && startDate > now) {
			return PRICE_STATUS.UPCOMING;
		}
	}

	// Check if end_date is in the past
	if (price.end_date && price.end_date.trim() !== '') {
		const endDate = new Date(price.end_date);
		// Check if date is valid (not NaN)
		if (!isNaN(endDate.getTime()) && endDate < now) {
			return PRICE_STATUS.INACTIVE;
		}
	}

	// Default to active
	return PRICE_STATUS.ACTIVE;
};

const getStatusChipVariant = (status: PRICE_STATUS): 'info' | 'default' | 'success' => {
	switch (status) {
		case PRICE_STATUS.UPCOMING:
			return 'info';
		case PRICE_STATUS.INACTIVE:
			return 'default';
		case PRICE_STATUS.ACTIVE:
			return 'success';
		default:
			return 'success';
	}
};

const formatPriceDateTooltip = (price: Price & { start_date?: string; end_date?: string }): React.ReactNode => {
	const dateItems: React.ReactNode[] = [];

	if (price.start_date && price.start_date.trim() !== '') {
		try {
			const startDate = new Date(price.start_date);
			if (!isNaN(startDate.getTime())) {
				dateItems.push(
					<div key='start' className='flex items-center gap-2'>
						<span className='text-xs font-medium text-gray-500'>Start</span>
						<span className='text-sm font-medium'>{formatDateTimeWithSecondsAndTimezone(startDate)}</span>
					</div>,
				);
			}
		} catch {
			// Ignore invalid dates
		}
	}

	if (price.end_date && price.end_date.trim() !== '') {
		try {
			const endDate = new Date(price.end_date);
			if (!isNaN(endDate.getTime())) {
				dateItems.push(
					<div key='end' className='flex items-center gap-2'>
						<span className='text-xs font-medium text-gray-500'>End</span>
						<span className='text-sm font-medium'>{formatDateTimeWithSecondsAndTimezone(endDate)}</span>
					</div>,
				);
			}
		} catch {
			// Ignore invalid dates
		}
	}

	if (dateItems.length === 0) {
		return <span className='text-sm'>No date information</span>;
	}

	return <div className='flex flex-col gap-2'>{dateItems}</div>;
};

const PlanPriceTable: FC<PlanChargesTableProps> = ({ plan, onPriceUpdate }) => {
	const navigate = useNavigate();
	const [showTerminateModal, setShowTerminateModal] = useState(false);
	const [selectedPriceForTermination, setSelectedPriceForTermination] = useState<Price | null>(null);
	const [selectedPriceForEdit, setSelectedPriceForEdit] = useState<Price | null>(null);
	const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);

	// ===== MUTATIONS =====
	const { mutateAsync: deletePrice, isPending: isDeletingPrice } = useMutation({
		mutationFn: async ({ priceId, data }: { priceId: string; data?: DeletePriceRequest }) => {
			return await PriceApi.DeletePrice(priceId, data);
		},
		onError: (error: ServerError) => {
			toast.error(error?.error?.message || 'Error deleting price');
		},
	});

	const { mutateAsync: syncPlanCharges, isPending: isSyncing } = useMutation({
		mutationFn: () => PlanApi.synchronizePlanPricesWithSubscription(plan.id),
		onSuccess: () => {
			toast.success('Sync has been started and will take up to 1 hour to complete.');
		},
		onError: (error: ServerError) => {
			toast.error(error?.error?.message || 'Error synchronizing charges with subscriptions');
		},
	});

	const isPending = isDeletingPrice || isSyncing;

	// ===== HANDLERS =====
	const handleEditPrice = useCallback((price: Price) => {
		setSelectedPriceForEdit(price);
		setIsPriceDialogOpen(true);
	}, []);

	const handlePriceUpdateSuccess = useCallback(() => {
		setIsPriceDialogOpen(false);
		setSelectedPriceForEdit(null);
		onPriceUpdate?.();
	}, [onPriceUpdate]);

	const handleTerminatePrice = useCallback(
		(priceId: string) => {
			const price = plan.prices?.find((p) => p.id === priceId);
			if (!price) return;

			setSelectedPriceForTermination(price);
			setShowTerminateModal(true);
		},
		[plan.prices],
	);

	const handleTerminateConfirm = useCallback(
		async (endDate: string | undefined, syncOption?: SyncOption) => {
			if (!selectedPriceForTermination) return;

			setShowTerminateModal(false);

			try {
				const deleteRequest: DeletePriceRequest | undefined = endDate ? { end_date: endDate } : undefined;
				await deletePrice({ priceId: selectedPriceForTermination.id, data: deleteRequest });

				const priceName = selectedPriceForTermination.meter?.name || selectedPriceForTermination.description || 'Price';
				const message = endDate
					? `${priceName} will be terminated on ${formatDateTimeWithSecondsAndTimezone(new Date(endDate))}.`
					: `${priceName} has been terminated immediately.`;
				toast.success(message);

				if (syncOption === SyncOption.EXISTING_ALSO) {
					await syncPlanCharges();
				}

				onPriceUpdate?.();
				setSelectedPriceForTermination(null);
			} catch (error) {
				console.error('Error terminating price:', error);
			}
		},
		[selectedPriceForTermination, deletePrice, syncPlanCharges, onPriceUpdate],
	);

	const handleTerminateCancel = useCallback(() => {
		setShowTerminateModal(false);
		setSelectedPriceForTermination(null);
	}, []);

	// ===== PROCESSED PRICES WITH PRECOMPUTED STATUS =====
	const processedPrices = useMemo<PriceWithStatus[]>(() => {
		if (!plan.prices || plan.prices.length === 0) return [];

		// Precompute status and related data for each price
		const pricesWithStatus: PriceWithStatus[] = plan.prices.map((price) => {
			const status = getPriceStatus(price);
			const variant = getStatusChipVariant(status);
			const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
			const tooltipContent = formatPriceDateTooltip(price);

			return {
				...price,
				precomputedStatus: status,
				statusVariant: variant,
				statusLabel,
				tooltipContent,
			};
		});

		// Sort: active first, then upcoming, then inactive
		const statusOrder: Record<PRICE_STATUS, number> = {
			[PRICE_STATUS.ACTIVE]: 0,
			[PRICE_STATUS.UPCOMING]: 1,
			[PRICE_STATUS.INACTIVE]: 2,
		};

		return pricesWithStatus.sort((a, b) => {
			return statusOrder[a.precomputedStatus] - statusOrder[b.precomputedStatus];
		});
	}, [plan.prices]);

	// ===== TABLE COLUMNS =====
	const chargeColumns: ColumnData<PriceWithStatus>[] = [
		{
			title: 'Display Name',
			render(rowData) {
				return <span>{rowData.display_name ?? '--'}</span>;
			},
		},
		{
			title: 'Charge Type',
			render: (row) => {
				return <span>{getPriceTypeLabel(row.type)}</span>;
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
			title: 'Status',
			render(rowData) {
				return (
					<Tooltip
						content={rowData.tooltipContent}
						delayDuration={0}
						sideOffset={5}
						className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[320px]'>
						<span>
							<Chip label={rowData.statusLabel} variant={rowData.statusVariant} />
						</span>
					</Tooltip>
				);
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
				const hasEndDate = !!(row.end_date && row.end_date.trim() !== '');
				return <PriceDropdown row={row} hasEndDate={hasEndDate} onEditPrice={handleEditPrice} onTerminatePrice={handleTerminatePrice} />;
			},
		},
	];

	// ===== RENDER =====
	return (
		<>
			{/* Terminate Price Modal */}
			<Dialog open={showTerminateModal} onOpenChange={setShowTerminateModal}>
				{selectedPriceForTermination && (
					<TerminatePriceModal
						planId={plan.id}
						price={selectedPriceForTermination}
						onCancel={handleTerminateCancel}
						onConfirm={handleTerminateConfirm}
						isLoading={isPending}
					/>
				)}
			</Dialog>

			{/* Update Price Dialog */}
			{selectedPriceForEdit && (
				<UpdatePriceDialog
					isOpen={isPriceDialogOpen}
					onOpenChange={setIsPriceDialogOpen}
					price={selectedPriceForEdit}
					planId={plan.id}
					onSuccess={handlePriceUpdateSuccess}
				/>
			)}

			{/* Charges Table */}
			{processedPrices.length > 0 ? (
				<Card variant='notched'>
					<CardHeader
						title='Charges'
						cta={
							<Button prefixIcon={<Plus />} onClick={() => navigate(`${RouteNames.plan}/${plan.id}/add-charges`)}>
								Add
							</Button>
						}
					/>
					<FlexpriceTable columns={chargeColumns} data={processedPrices} />
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
