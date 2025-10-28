import { FC } from 'react';
import { ActionButton, Chip } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '../Table';
import formatDate from '@/utils/common/format_date';
import { Subscription, SUBSCRIPTION_CANCELLATION_TYPE, SUBSCRIPTION_STATUS } from '@/models/Subscription';
import { useNavigate } from 'react-router-dom';
import { RouteNames } from '@/core/routes/Routes';
import SubscriptionApi from '@/api/SubscriptionApi';
import RedirectCell from '../Table/RedirectCell';
import { Trash2 } from 'lucide-react';

interface Props {
	data: Subscription[];
	onEdit?: (subscription: Subscription) => void;
}
const getSubscriptionStatusChip = (status: SUBSCRIPTION_STATUS) => {
	switch (status) {
		case SUBSCRIPTION_STATUS.ACTIVE:
			return <Chip variant='success' label='Active' />;
		case SUBSCRIPTION_STATUS.CANCELLED:
			return <Chip variant='failed' label='Cancelled' />;
		case SUBSCRIPTION_STATUS.PAUSED:
			return <Chip variant='warning' label='Paused' />;
		case SUBSCRIPTION_STATUS.INCOMPLETE:
			return <Chip variant='warning' label='Incomplete' />;
		case SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED:
			return <Chip variant='failed' label='Incomplete Expired' />;
		case SUBSCRIPTION_STATUS.PAST_DUE:
			return <Chip variant='failed' label='Past Due' />;
		case SUBSCRIPTION_STATUS.TRIALING:
			return <Chip variant='warning' label='Trialing' />;
		case SUBSCRIPTION_STATUS.UNPAID:
			return <Chip variant='failed' label='Unpaid' />;
		default:
			return <Chip variant='default' label='Inactive' />;
	}
};

const SubscriptionTable: FC<Props> = ({ data, onEdit }) => {
	const navigate = useNavigate();

	const columns: ColumnData<Subscription>[] = [
		{
			title: 'Customer',
			render: (row) => (
				<RedirectCell redirectUrl={`${RouteNames.customers}/${row.customer_id}`}>{row.customer?.name || row.customer_id}</RedirectCell>
			),
		},
		{
			title: 'Plan',
			render: (row) => <RedirectCell redirectUrl={`${RouteNames.plan}/${row.plan_id}`}>{row.plan?.name || row.plan_id}</RedirectCell>,
		},

		{
			title: 'Status',
			render: (row) => {
				const label = getSubscriptionStatusChip(row.subscription_status);
				return label;
			},
		},
		{
			title: 'Start Date',
			render: (row) => formatDate(row.start_date),
		},
		{
			title: 'Renewal Date',
			render: (row) => formatDate(row.current_period_end),
		},
		{
			fieldVariant: 'interactive',
			render: (row) => (
				<ActionButton
					isArchiveDisabled={row.subscription_status === SUBSCRIPTION_STATUS.CANCELLED}
					entityName='Subscription'
					isEditDisabled={true}
					refetchQueryKey='fetchSubscriptions'
					archiveText='Cancel'
					archiveIcon={<Trash2 />}
					deleteMutationFn={async (id) => {
						await SubscriptionApi.cancelSubscription(id, {
							cancellation_type: SUBSCRIPTION_CANCELLATION_TYPE.IMMEDIATE,
						});
					}}
					editPath={`${RouteNames.subscriptions}/${row.id}/edit`}
					onEdit={() => {
						onEdit?.(row);
					}}
					id={row.id}
				/>
			),
		},
	];

	return (
		<FlexpriceTable
			showEmptyRow
			columns={columns}
			data={data}
			onRowClick={(row) => {
				navigate(`${RouteNames.customers}/${row?.customer_id}/subscription/${row?.id}`);
			}}
		/>
	);
};

export default SubscriptionTable;
