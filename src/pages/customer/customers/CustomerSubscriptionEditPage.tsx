import { Button, Chip, Loader, Page, Spacer } from '@/components/atoms';
import { DetailsCard } from '@/components/molecules';
import { RouteNames } from '@/core/routes/Routes';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import CustomerApi from '@/api/CustomerApi';
import SubscriptionApi from '@/api/SubscriptionApi';
import { getCurrencySymbol } from '@/utils/common/helper_functions';
import formatDate from '@/utils/common/format_date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { LineItem } from '@/models/Subscription';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_CANCELLATION_TYPE } from '@/models/Subscription';
import SubscriptionLineItemTable from '@/components/molecules/SubscriptionLineItemTable/SubscriptionLineItemTable';
import { getSubscriptionStatus } from '@/components/organisms/Subscription/SubscriptionTable';

type Params = {
	id: string;
};

const CustomerSubscriptionEditPage: React.FC = () => {
	const navigate = useNavigate();
	const { id: subscriptionId } = useParams<Params>();
	const queryClient = useQueryClient();

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
		queryKey: ['fetchCustomerDetails', subscriptionDetails?.subscription?.customer_id],
		queryFn: async () => await CustomerApi.getCustomerById(subscriptionDetails?.subscription?.customer_id ?? ''),
		enabled: !!subscriptionDetails?.subscription?.customer_id && !!subscriptionDetails?.subscription?.customer_id,
	});

	// Mock data for subscription line items - replace with actual API call
	const { data: subscriptionLineItems, isLoading: isLineItemsLoading } = useQuery({
		queryKey: ['subscriptionLineItems', subscriptionId],
		queryFn: async () => {
			// This should be replaced with actual API call to fetch subscription line items
			// For now, returning mock data based on the subscription details
			return subscriptionDetails?.subscription?.line_items || [];
		},
		enabled: !!subscriptionDetails,
	});

	const { mutate: cancelSubscription } = useMutation({
		mutationFn: async () => {
			return await SubscriptionApi.cancelSubscription(subscriptionId!, {
				cancellation_type: SUBSCRIPTION_CANCELLATION_TYPE.IMMEDIATE,
			});
		},
		onSuccess: () => {
			toast.success('Subscription cancelled successfully');
			navigate(`${RouteNames.subscriptions}`);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to cancel subscription');
		},
	});

	const { mutate: terminateLineItem } = useMutation({
		mutationFn: async (lineItemId: string) => {
			// This should be replaced with actual API call to terminate a line item
			// For now, just simulating the operation
			return new Promise((resolve) => {
				setTimeout(() => resolve({ id: lineItemId }), 1000);
			});
		},
		onSuccess: () => {
			toast.success('Line item terminated successfully');
			queryClient.invalidateQueries({ queryKey: ['subscriptionLineItems', subscriptionId] });
		},
		onError: (error: { message?: string }) => {
			toast.error(error?.message || 'Failed to terminate line item');
		},
	});

	useEffect(() => {
		if (subscriptionDetails?.plan?.name) {
			updateBreadcrumb(2, `${subscriptionDetails.plan.name} - Edit`);
		}

		if (customer?.external_id) {
			updateBreadcrumb(1, customer.external_id);
		}
	}, [subscriptionDetails, updateBreadcrumb, customer]);

	const handleEditLineItem = (_lineItem: LineItem) => {
		// Here you would open a modal or navigate to edit form
		toast.success('Edit functionality will be implemented');
	};

	const handleTerminateLineItem = (lineItemId: string) => {
		terminateLineItem(lineItemId);
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
		{ label: 'Subscription Name', value: subscriptionDetails?.plan?.name },
		{
			label: 'Status',
			value: (
				<Chip
					label={getSubscriptionStatus(subscriptionDetails?.subscription?.subscription_status ?? '')}
					variant={subscriptionDetails?.subscription?.subscription_status === SUBSCRIPTION_STATUS.ACTIVE ? 'success' : 'default'}
				/>
			),
		},
		{ label: 'Billing Cycle', value: subscriptionDetails?.subscription?.billing_cycle || '--' },
		{ label: 'Start Date', value: formatDate(subscriptionDetails?.subscription?.start_date ?? '') },
		{ label: 'Current Period End', value: formatDate(subscriptionDetails?.subscription?.current_period_end ?? '') },
		...(subscriptionDetails?.subscription?.commitment_amount
			? [
					{
						label: 'Commitment Amount',
						value: `${getCurrencySymbol(subscriptionDetails?.subscription?.currency || '')} ${subscriptionDetails?.subscription?.commitment_amount}`,
					},
				]
			: []),
		...(subscriptionDetails?.subscription?.overage_factor && subscriptionDetails?.subscription?.overage_factor > 1
			? [{ label: 'Overage Factor', value: subscriptionDetails?.subscription?.overage_factor.toString() }]
			: []),
	];

	return (
		<Page
			heading={`${subscriptionDetails?.plan?.name} - Edit`}
			headingCTA={
				<>
					<Button
						onClick={() =>
							navigate(`${RouteNames.customers}/${subscriptionDetails?.subscription?.customer_id}/subscription/${subscriptionId}`)
						}
						variant={'outline'}
						className='flex gap-2'>
						<EyeOff />
						View Details
					</Button>

					<Button
						onClick={() => cancelSubscription()}
						disabled={subscriptionDetails?.subscription?.subscription_status === SUBSCRIPTION_STATUS.CANCELLED}
						variant={'outline'}
						className='flex gap-2'>
						<Trash2 />
						Cancel Subscription
					</Button>
				</>
			}>
			<div className='space-y-6'>
				<DetailsCard variant='stacked' title='Subscription Details' data={subscriptionDetailsData} />

				<SubscriptionLineItemTable
					data={subscriptionLineItems || []}
					isLoading={isLineItemsLoading}
					onEdit={handleEditLineItem}
					onTerminate={handleTerminateLineItem}
				/>

				<Spacer className='!h-20' />
			</div>
		</Page>
	);
};

export default CustomerSubscriptionEditPage;
