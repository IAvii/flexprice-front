import { Loader, Page, Spacer } from '@/components/atoms';
import { DetailsCard } from '@/components/molecules';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import CustomerApi from '@/api/CustomerApi';
import SubscriptionApi from '@/api/SubscriptionApi';
import { getCurrencySymbol } from '@/utils/common/helper_functions';
import formatDate from '@/utils/common/format_date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { LineItem } from '@/models/Subscription';
import SubscriptionLineItemTable from '@/components/molecules/SubscriptionLineItemTable/SubscriptionLineItemTable';
import PriceOverrideDialog from '@/components/molecules/PriceOverrideDialog/PriceOverrideDialog';
import { getSubscriptionStatus } from '@/components/organisms/Subscription/SubscriptionTable';
import { UpdateSubscriptionLineItemRequest, DeleteSubscriptionLineItemRequest } from '@/types/dto/Subscription';
import { Price, BILLING_MODEL, TIER_MODE } from '@/models/Price';
import { ExtendedPriceOverride } from '@/utils/common/price_override_helpers';
import { RouteNames } from '@/core/routes/Routes';

type Params = {
	id: string;
};

const CustomerSubscriptionEditPage: React.FC = () => {
	const { id: subscriptionId } = useParams<Params>();
	const queryClient = useQueryClient();
	const [editingLineItem, setEditingLineItem] = useState<LineItem | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [overriddenPrices, setOverriddenPrices] = useState<Record<string, ExtendedPriceOverride>>({});

	const { updateBreadcrumb } = useBreadcrumbsStore();

	const {
		data: subscriptionDetails,
		isLoading: isSubscriptionDetailsLoading,
		isError: isSubscriptionDetailsError,
	} = useQuery({
		queryKey: ['subscriptionDetails', subscriptionId],
		queryFn: async () => {
			return await SubscriptionApi.getSubscription(subscriptionId!);
		},
		enabled: !!subscriptionId,
	});

	const { data: customer } = useQuery({
		queryKey: ['fetchCustomerDetails', subscriptionDetails?.customer_id],
		queryFn: async () => await CustomerApi.getCustomerById(subscriptionDetails?.customer_id ?? ''),
		enabled: !!subscriptionDetails?.customer_id && !!subscriptionDetails?.customer_id,
	});

	const { mutate: updateLineItem } = useMutation({
		mutationFn: async ({ lineItemId, updateData }: { lineItemId: string; updateData: UpdateSubscriptionLineItemRequest }) => {
			return await SubscriptionApi.updateSubscriptionLineItem(lineItemId, updateData);
		},
		onSuccess: () => {
			toast.success('Line item updated successfully');
			queryClient.invalidateQueries({ queryKey: ['subscriptionLineItems', subscriptionId] });
			queryClient.invalidateQueries({ queryKey: ['subscriptionDetails', subscriptionId] });
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to update line item');
		},
	});

	const { mutate: terminateLineItem } = useMutation({
		mutationFn: async ({ lineItemId, endDate }: { lineItemId: string; endDate?: string }) => {
			const payload: DeleteSubscriptionLineItemRequest = {};
			if (endDate) {
				payload.end_date = endDate;
			}
			return await SubscriptionApi.deleteSubscriptionLineItem(lineItemId, payload);
		},
		onSuccess: () => {
			toast.success('Line item terminated successfully');
			queryClient.invalidateQueries({ queryKey: ['subscriptionLineItems', subscriptionId] });
			queryClient.invalidateQueries({ queryKey: ['subscriptionDetails', subscriptionId] });
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to terminate line item');
		},
	});

	useEffect(() => {
		if (subscriptionDetails?.plan?.name) {
			updateBreadcrumb(2, `Subscription`, `${RouteNames.customers}/${customer?.id}/subscription/${subscriptionId}`);
		}

		if (customer?.external_id) {
			updateBreadcrumb(1, customer.external_id, `${RouteNames.customers}/${customer.id}`);
		}
	}, [subscriptionDetails, updateBreadcrumb, customer, subscriptionId]);

	const handleEditLineItem = (lineItem: LineItem) => {
		setEditingLineItem(lineItem);
		setIsEditDialogOpen(true);
	};

	const handleTerminateLineItem = (lineItemId: string, endDate?: string) => {
		terminateLineItem({ lineItemId, endDate });
	};

	// Convert price override data to subscription line item update data
	const convertPriceOverrideToLineItemUpdate = (
		_priceId: string,
		override: Partial<ExtendedPriceOverride>,
	): UpdateSubscriptionLineItemRequest => {
		const updateData: UpdateSubscriptionLineItemRequest = {};

		if (override.amount) {
			updateData.amount = parseFloat(override.amount);
		}

		if (override.billing_model && override.billing_model !== 'SLAB_TIERED') {
			updateData.billing_model = override.billing_model;
		}

		if (override.tier_mode) {
			updateData.tier_mode = override.tier_mode;
		}

		if (override.tiers) {
			updateData.tiers = override.tiers;
		}

		if (override.transform_quantity) {
			updateData.transform_quantity = override.transform_quantity;
		}

		if (override.effective_from) {
			updateData.effective_from = override.effective_from;
		}

		return updateData;
	};

	const handlePriceOverride = (priceId: string, override: Partial<ExtendedPriceOverride>) => {
		if (!editingLineItem) return;

		const updateData = convertPriceOverrideToLineItemUpdate(priceId, override);
		updateLineItem({ lineItemId: editingLineItem.id, updateData });
		setIsEditDialogOpen(false);
		setEditingLineItem(null);
	};

	const handleResetOverride = (priceId: string) => {
		// Reset the override for this price
		setOverriddenPrices((prev) => {
			const newOverrides = { ...prev };
			delete newOverrides[priceId];
			return newOverrides;
		});
	};

	// Convert LineItem to Price object for PriceOverrideDialog
	const convertLineItemToPrice = (lineItem: LineItem): Price => {
		if (lineItem.price) {
			return lineItem.price;
		}

		return {
			id: lineItem.price_id,
			amount: lineItem.quantity?.toString() || '0',
			currency: lineItem.currency,
			billing_model: lineItem.price_type as BILLING_MODEL,
			tier_mode: TIER_MODE.VOLUME,
			tiers: [],
			transform_quantity: { divide_by: 1 },
			description: lineItem.display_name,
			meter: { name: lineItem.meter_display_name },
			type: 'USAGE' as const,
			display_amount: lineItem.quantity?.toString() || '0',
			entity_type: 'SUBSCRIPTION',
			entity_id: lineItem.subscription_id,
			price_unit_type: 'UNIT',
			created_at: lineItem.created_at,
			updated_at: lineItem.updated_at,
			status: 'ACTIVE',
			environment_id: lineItem.environment_id,
			tenant_id: lineItem.tenant_id,
			plan_id: lineItem.plan_id,
			meter_id: lineItem.meter_id,
			metadata: lineItem.metadata,
			billing_period: 'MONTHLY',
			billing_period_count: 1,
			billing_cadence: 'ADVANCE',
			filter_values: {},
			unit_amount: lineItem.quantity?.toString() || '0',
			flat_amount: '0',
			up_to: null,
		} as unknown as Price;
	};

	if (isSubscriptionDetailsLoading) {
		return <Loader />;
	}

	if (isSubscriptionDetailsError) {
		toast.error('Error loading subscription data');
		return null;
	}

	if (!subscriptionDetails) {
		toast.error('No subscription data available');
		return null;
	}

	const subscriptionDetailsData = [
		{ label: 'Plan', value: subscriptionDetails?.plan?.name },
		{
			label: 'Status',
			value: getSubscriptionStatus(subscriptionDetails?.subscription_status ?? ''),
		},
		{ label: 'Billing Cycle', value: subscriptionDetails?.billing_cycle || '--' },
		{ label: 'Start Date', value: formatDate(subscriptionDetails?.start_date ?? '') },
		{ label: 'Current Period End', value: formatDate(subscriptionDetails?.current_period_end ?? '') },
		...(subscriptionDetails?.commitment_amount
			? [
					{
						label: 'Commitment Amount',
						value: `${getCurrencySymbol(subscriptionDetails?.currency || '')} ${subscriptionDetails?.commitment_amount}`,
					},
				]
			: []),
		...(subscriptionDetails?.overage_factor && subscriptionDetails?.overage_factor > 1
			? [{ label: 'Overage Factor', value: subscriptionDetails?.overage_factor.toString() }]
			: []),
	];

	return (
		<Page heading={`Edit Subscription`}>
			<div className='space-y-6'>
				<DetailsCard variant='stacked' title='Subscription Details' data={subscriptionDetailsData} />

				<SubscriptionLineItemTable
					data={subscriptionDetails?.line_items || []}
					isLoading={isSubscriptionDetailsLoading}
					onEdit={handleEditLineItem}
					onTerminate={handleTerminateLineItem}
				/>

				{/* Price Override Dialog */}
				{editingLineItem && (
					<PriceOverrideDialog
						isOpen={isEditDialogOpen}
						onOpenChange={setIsEditDialogOpen}
						price={convertLineItemToPrice(editingLineItem)}
						onPriceOverride={handlePriceOverride}
						onResetOverride={handleResetOverride}
						overriddenPrices={overriddenPrices}
						showEffectiveFrom={true}
					/>
				)}

				<Spacer className='!h-20' />
			</div>
		</Page>
	);
};

export default CustomerSubscriptionEditPage;
