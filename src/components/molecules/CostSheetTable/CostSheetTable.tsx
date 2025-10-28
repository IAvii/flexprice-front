import { FC } from 'react';
import FlexpriceTable, { ColumnData } from '../Table';
import CostSheet from '@/models/CostSheet';
import { ActionButton, Chip } from '@/components/atoms';
import formatChips from '@/utils/common/format_chips';
import formatDate from '@/utils/common/format_date';
import { useNavigate } from 'react-router-dom';
import { RouteNames } from '@/core/routes/Routes';
import CostSheetApi from '@/api/CostSheetApi';

interface Props {
	data: CostSheet[];
	onEdit?: (costSheet: CostSheet) => void;
}

const CostSheetTable: FC<Props> = ({ data, onEdit }) => {
	const navigate = useNavigate();

	const columnData: ColumnData<CostSheet>[] = [
		{
			fieldName: 'name',
			title: 'Cost Sheet Name',
		},
		{
			fieldName: 'lookup_key',
			title: 'Lookup Key',
		},
		{
			title: 'Status',
			render: (row) => {
				const label = formatChips(row?.status);
				return <Chip variant={label === 'Active' ? 'success' : 'default'} label={label} />;
			},
		},
		{
			title: 'Updated At',
			render: (row) => {
				return formatDate(row?.updated_at);
			},
		},
		{
			fieldVariant: 'interactive',
			render(row) {
				return (
					<ActionButton
						deleteMutationFn={async () => {
							return await CostSheetApi.DeleteCostSheet(row?.id);
						}}
						id={row?.id}
						isEditDisabled={!onEdit}
						isArchiveDisabled={row?.status === 'archived'}
						refetchQueryKey={'fetchCostSheets'}
						entityName={row?.name}
						onEdit={() => onEdit?.(row)}
					/>
				);
			},
		},
	];

	return (
		<div>
			<FlexpriceTable
				data={data}
				columns={columnData}
				showEmptyRow
				onRowClick={(row) => {
					navigate(RouteNames.costSheetDetails + `/${row?.id}`);
				}}
			/>
		</div>
	);
};

export default CostSheetTable;
