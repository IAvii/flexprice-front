import { FC } from 'react';
import { ActionButton, Chip } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '../Table';
import formatDate from '@/utils/common/format_date';
import formatChips from '@/utils/common/format_chips';
import Customer from '@/models/Customer';
import CustomerApi from '@/api/CustomerApi';
import { useNavigate } from 'react-router-dom';
import { RouteNames } from '@/core/routes/Routes';
import { ENTITY_STATUS } from '@/models';

export interface Props {
	data: Customer[];
	onEdit: (customer: Customer) => void;
}

const CustomerTable: FC<Props> = ({ data, onEdit }) => {
	const navigate = useNavigate();
	const mappedData = data?.map((customer) => ({
		...customer,
	}));
	const columns: ColumnData[] = [
		{ fieldName: 'name', title: 'Name', width: '400px' },
		{ fieldName: 'external_id', title: 'Lookup Key' },
		{
			title: 'Status',

			render: (row) => {
				const label = formatChips(row.status);
				return <Chip variant={label === 'Active' ? 'success' : 'default'} label={label} />;
			},
		},
		{
			title: 'Updated at',
			render: (row) => {
				return <>{formatDate(row.updated_at)}</>;
			},
		},
		{
			title: '',
			fieldVariant: 'interactive',
			render: (row) => (
				<ActionButton
					id={row.id}
					deleteMutationFn={(id) => CustomerApi.deleteCustomerById(id)}
					refetchQueryKey='fetchCustomers'
					entityName='Customer'
					edit={{
						enabled: row.status === ENTITY_STATUS.PUBLISHED,
						path: `/billing/customers/edit-customer?id=${row.id}`,
						onClick: () => onEdit(row),
					}}
					archive={{
						enabled: row.status === ENTITY_STATUS.PUBLISHED,
					}}
				/>
			),
		},
	];

	return (
		<FlexpriceTable
			showEmptyRow
			columns={columns}
			data={mappedData}
			onRowClick={(row) => {
				navigate(RouteNames.customers + `/${row?.id}`);
			}}
		/>
	);
};

export default CustomerTable;
