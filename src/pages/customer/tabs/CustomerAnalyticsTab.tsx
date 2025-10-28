import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { Loader, FeatureMultiSelect, DateRangePicker } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import toast from 'react-hot-toast';
import EventsApi from '@/api/EventsApi';
import CostSheetApi from '@/api/CostSheetApi';
import Feature from '@/models/Feature';
import { GetUsageAnalyticsRequest } from '@/types/dto';
import { GetCostAnalyticsRequest } from '@/types/dto/Cost';
import { WindowSize } from '@/models';
import CustomerUsageChart from '@/components/molecules/CustomerUsageChart';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { UsageAnalyticItem } from '@/models/Analytics';
import { formatNumber } from '@/utils/common';
import { MetricCard, CostDataTable } from '@/components/molecules';
import { getCurrencySymbol } from '@/utils/common/helper_functions';

const CustomerAnalyticsTab = () => {
	const { id: customerId } = useParams();
	const { updateBreadcrumb } = useBreadcrumbsStore();

	// Filter states
	const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
	const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() - 90)));
	const [endDate, setEndDate] = useState<Date | undefined>(new Date());

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

	// Prepare Usage API parameters
	const usageApiParams: GetUsageAnalyticsRequest | null = useMemo(() => {
		if (!customer?.external_id) {
			return null;
		}

		const params: GetUsageAnalyticsRequest = {
			external_customer_id: customer.external_id,
			window_size: WindowSize.DAY,
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

	// Prepare Cost API parameters
	const costApiParams: GetCostAnalyticsRequest | null = useMemo(() => {
		if (!customer?.external_id) {
			return null;
		}

		const params: GetCostAnalyticsRequest = {
			external_customer_id: customer.external_id,
			expand: ['meter', 'price'],
		};

		if (selectedFeatures.length > 0) {
			params.meter_ids = selectedFeatures.map((feature) => feature.meter_id);
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
	const [debouncedUsageParams, setDebouncedUsageParams] = useState<GetUsageAnalyticsRequest | null>(null);
	const [debouncedCostParams, setDebouncedCostParams] = useState<GetCostAnalyticsRequest | null>(null);

	useEffect(() => {
		if (usageApiParams) {
			const timeoutId = setTimeout(() => {
				setDebouncedUsageParams(usageApiParams);
			}, 300);

			return () => clearTimeout(timeoutId);
		} else {
			setDebouncedUsageParams(null);
		}
	}, [usageApiParams]);

	useEffect(() => {
		if (costApiParams) {
			const timeoutId = setTimeout(() => {
				setDebouncedCostParams(costApiParams);
			}, 300);

			return () => clearTimeout(timeoutId);
		} else {
			setDebouncedCostParams(null);
		}
	}, [costApiParams]);

	const {
		data: usageData,
		isLoading: usageLoading,
		error: usageError,
	} = useQuery({
		queryKey: ['usage', customerId, debouncedUsageParams],
		queryFn: async () => {
			if (!debouncedUsageParams) {
				throw new Error('API parameters not available');
			}
			return await EventsApi.getUsageAnalytics(debouncedUsageParams);
		},
		enabled: !!debouncedUsageParams,
	});

	const {
		data: costData,
		isLoading: costLoading,
		error: costError,
	} = useQuery({
		queryKey: ['cost-analytics', customerId, debouncedCostParams],
		queryFn: async () => {
			return await CostSheetApi.GetCostAnalytics(debouncedCostParams ?? {});
		},
		enabled: !!debouncedCostParams,
	});

	useEffect(() => {
		updateBreadcrumb(4, 'Analytics');
	}, [updateBreadcrumb]);

	useEffect(() => {
		if (customerError) {
			toast.error('Error fetching customer data');
		}
	}, [customerError]);

	useEffect(() => {
		if (usageError) {
			toast.error('Error fetching usage data');
		}
	}, [usageError]);

	useEffect(() => {
		if (costError) {
			toast.error('Error fetching cost data');
		}
	}, [costError]);

	if (customerLoading) {
		return <Loader />;
	}

	const handleDateRangeChange = ({ startDate: newStartDate, endDate: newEndDate }: { startDate?: Date; endDate?: Date }) => {
		setStartDate(newStartDate);
		setEndDate(newEndDate);
	};

	const isLoading = usageLoading || costLoading;

	return (
		<div className='space-y-6'>
			<h3 className='text-lg font-medium text-gray-900 mb-8 mt-1'>Analytics</h3>

			{/* Filters Section */}
			<div className='flex flex-wrap items-end gap-8'>
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

			{/* Single Loader at Page Level */}
			{isLoading ? (
				<div className='flex items-center justify-center py-12'>
					<Loader />
				</div>
			) : (
				<>
					{/* Summary Metrics - Revenue tiles */}
					{costData && (
						<div className='pt-9'>
							{(() => {
								const totalRevenue = parseFloat(costData.total_revenue || '0');
								const totalCost = parseFloat(costData.total_cost || '0');
								const margin = parseFloat(costData.margin || '0');
								const marginPercent = parseFloat(costData.margin_percent || '0');

								return (
									<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
										<MetricCard title='Revenue' value={totalRevenue} currency={costData.currency} />
										<MetricCard title='Cost' value={totalCost} currency={costData.currency} />
										<MetricCard
											title='Margin'
											value={margin}
											currency={costData.currency}
											showChangeIndicator={true}
											isNegative={margin < 0}
										/>
										<MetricCard
											title='Margin %'
											value={marginPercent}
											isPercent={true}
											showChangeIndicator={true}
											isNegative={marginPercent < 0}
										/>
									</div>
								);
							})()}
						</div>
					)}

					{/* Usage Chart */}
					{usageData && (
						<div className=''>
							<CustomerUsageChart data={usageData} />
						</div>
					)}

					{/* Usage Data Table */}
					{usageData && (
						<div className='!mt-10'>
							<UsageDataTable items={usageData.items} />
						</div>
					)}

					{/* Cost Data Table */}
					{costData && (
						<div className='pt-9'>
							<CostDataTable items={costData.cost_analytics} />
						</div>
					)}
				</>
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
				const currency = getCurrencySymbol(row.currency);
				return (
					<span>
						{currency}
						{formatNumber(row.total_cost, 2)}
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

export default CustomerAnalyticsTab;
