import React from 'react';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { CostAnalyticItem } from '@/types/dto/Cost';
import { formatNumber } from '@/utils/common';

interface CostDataTableProps {
	items: CostAnalyticItem[];
}

export const CostDataTable: React.FC<CostDataTableProps> = ({ items }) => {
	// Define table columns
	const columns: ColumnData<CostAnalyticItem>[] = [
		{
			title: 'Cost Attribute',
			render: (row: CostAnalyticItem) => {
				return <span>{row.meter_name || row.meter?.name || row.meter_id}</span>;
			},
		},
		{
			title: 'Total Quantity',
			render: (row: CostAnalyticItem) => {
				return <span>{formatNumber(parseFloat(row.total_quantity || '0'))}</span>;
			},
		},
		{
			title: 'Total Cost',
			render: (row: CostAnalyticItem) => {
				return (
					<span>
						{formatNumber(parseFloat(row.total_cost || '0'), 2)} {row.currency}
					</span>
				);
			},
		},
	];

	// Prepare data for the table with stable IDs
	const tableData = items.map((item) => ({
		...item,
		// Use meter_id as primary key, fallback to generated ID from stable fields
		id:
			item.meter_id ||
			`item-${[item.meter_name, item.source, item.customer_id || item.external_customer_id, item.price_id].filter(Boolean).join('-')}` ||
			'unknown-item',
	}));

	return (
		<>
			<h1 className='text-lg font-medium text-gray-900 mb-4'>Cost Breakdown</h1>
			<FlexpriceTable columns={columns} data={tableData} showEmptyRow />
		</>
	);
};
