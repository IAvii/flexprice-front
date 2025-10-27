import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { Card, Loader, FeatureMultiSelect, DateRangePicker } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import toast from 'react-hot-toast';
import EventsApi from '@/api/EventsApi';
import Feature from '@/models/Feature';
import { GetUsageAnalyticsRequest } from '@/types/dto';
import { WindowSize } from '@/models';
import CustomerUsageChart from '@/components/molecules/CustomerUsageChart';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { UsageAnalyticItem } from '@/models/Analytics';
import { formatNumber } from '@/utils/common';

const CustomerUsageTab = () => {
	const { id: customerId } = useParams();
	const { updateBreadcrumb } = useBreadcrumbsStore();

	// Filter states
	const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
	const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)));
	const [endDate, setEndDate] = useState<Date>(new Date());

	const {
		data: customer,
		isLoading: customerLoading,
		error: customerError,
	} = useQuery({
		queryKey: ['customer', customerId],
		queryFn: async () => {
			if (!customerId) throw new Error('Customer ID is required');
			return await CustomerApi.getCustomerById(customerId);
		},
		enabled: !!customerId,
	});

	// Prepare API parameters
	const apiParams: GetUsageAnalyticsRequest | null = useMemo(() => {
		if (!customer?.external_id) {
			return null;
		}

		const params: GetUsageAnalyticsRequest = {
			external_customer_id: customer.external_id,
			window_size: WindowSize.HOUR,
		};

		if (selectedFeatures.length > 0) {
			params.feature_ids = selectedFeatures.map((f) => f.id);
		}

		if (startDate) {
			params.start_time = startDate.toISOString();
		}

		if (endDate) {
			params.end_time = endDate.toISOString();
		}

		return params;
	}, [customer?.external_id, selectedFeatures, startDate, endDate]);

	// Debounced API parameters with 300ms delay
	const [debouncedApiParams, setDebouncedApiParams] = useState<GetUsageAnalyticsRequest | null>(null);

	useEffect(() => {
		if (apiParams) {
			const timeoutId = setTimeout(() => {
				setDebouncedApiParams(apiParams);
			}, 300);

			return () => clearTimeout(timeoutId);
		} else {
			setDebouncedApiParams(null);
		}
	}, [apiParams]);

	const {
		data: usageData,
		isLoading: usageLoading,
		error: usageError,
	} = useQuery({
		queryKey: ['usage', customerId, debouncedApiParams],
		queryFn: async () => {
			if (!debouncedApiParams) {
				throw new Error('API parameters not available');
			}
			return await EventsApi.getUsageAnalyticsV2(debouncedApiParams);
		},
		enabled: !!debouncedApiParams,
	});

	useEffect(() => {
		updateBreadcrumb(4, 'Usage');
	}, [updateBreadcrumb]);

	if (customerLoading) {
		return <Loader />;
	}

	if (customerError) {
		toast.error('Error fetching customer data');
	}

	if (usageError) {
		toast.error('Error fetching usage data');
	}

	const handleDateRangeChange = ({ startDate: newStartDate, endDate: newEndDate }: { startDate?: Date; endDate?: Date }) => {
		if (newStartDate) {
			setStartDate(newStartDate);
		}
		if (newEndDate) {
			setEndDate(newEndDate);
		}
	};

	return (
		<div className='space-y-6'>
			<h3 className='text-lg font-medium text-gray-900 mb-8'>Usage Analytics</h3>

			{/* Filters Section */}
			<div className='flex flex-wrap items-end gap-3'>
				<div className='flex-1 min-w-[200px] max-w-md'>
					<FeatureMultiSelect
						label='Features'
						placeholder='Select features'
						values={selectedFeatures.map((f) => f.id)}
						onChange={setSelectedFeatures}
						className='text-sm'
					/>
				</div>
				<DateRangePicker
					startDate={startDate}
					endDate={endDate}
					onChange={handleDateRangeChange}
					placeholder='Select date range'
					title='Date Range'
				/>
			</div>

			{/* Chart Display */}
			{usageLoading ? (
				<div className='flex items-center justify-center py-12'>
					<Loader />
				</div>
			) : (
				usageData && (
					<div>
						<CustomerUsageChart data={usageData} />
					</div>
				)
			)}

			{/* Usage Data Table */}
			{usageLoading ? (
				<div className='mt-6'>
					<h1 className='text-lg font-medium text-gray-900 mb-4'>Usage Breakdown</h1>
					<Card>
						<div className='p-12'>
							<div className='flex items-center justify-center'>
								<Loader />
							</div>
						</div>
					</Card>
				</div>
			) : (
				usageData && (
					<div className='mt-6'>
						<UsageDataTable items={usageData.items} />
					</div>
				)
			)}
		</div>
	);
};

const UsageDataTable: React.FC<{ items: UsageAnalyticItem[] }> = ({ items }) => {
	// Define table columns
	const columns: ColumnData<UsageAnalyticItem>[] = [
		{
			title: 'Feature',
			render: (row: UsageAnalyticItem) => {
				return <span>{row.name || row.name || 'Unknown'}</span>;
			},
		},
		{
			title: 'Total Usage',
			render: (row: UsageAnalyticItem) => {
				const unit = row.unit ? ` ${row.unit}${row.total_usage !== 1 && row.unit_plural ? 's' : ''}` : '';
				return (
					<span>
						{formatNumber(row.total_usage)}
						{unit}
					</span>
				);
			},
		},
		{
			title: 'Total Cost',
			render: (row: UsageAnalyticItem) => {
				if (row.total_cost === 0 || !row.currency) return '-';
				return (
					<span>
						{formatNumber(row.total_cost, 2)} {row.currency}
					</span>
				);
			},
		},
	];

	// Prepare data for the table
	const tableData = items.map((item) => ({
		...item,
		// Ensure we have all required fields for the table
		id: item.feature_id || item.source || 'unknown',
	}));

	return (
		<>
			<h1 className='text-lg font-medium text-gray-900 mb-4'>Usage Breakdown</h1>
			<FlexpriceTable columns={columns} data={tableData} showEmptyRow />
		</>
	);
};

export default CustomerUsageTab;
