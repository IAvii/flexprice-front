import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { Page, Card, Button, Input, DateRangePicker, FeatureMultiSelect } from '@/components/atoms';
import CostAnalyticsApi from '@/api/CostAnalyticsApi';
import toast from 'react-hot-toast';
import { Loader, RefreshCw } from 'lucide-react';
import { GetCombinedAnalyticsRequest, GetCombinedAnalyticsResponse } from '@/types/dto/CostAnalytics';
import Feature from '@/models/Feature';

// Type guard to check if data is GetCombinedAnalyticsResponse
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCombinedAnalytics = (data: any): data is GetCombinedAnalyticsResponse => {
	return 'total_revenue' in data && 'margin' in data;
};
import { WindowSize } from '@/models';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { CostAnalyticItem } from '@/types/dto/CostAnalytics';
import { formatNumber } from '@/utils/common';
import { ApiDocsContent } from '@/components/molecules';

const CostAnalyticsPage: React.FC = () => {
	const { updateBreadcrumb } = useBreadcrumbsStore();

	// Filter states
	const [customerId, setCustomerId] = useState<string>('');
	const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
	const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)));
	const [endDate, setEndDate] = useState<Date>(new Date());

	// Prepare API parameters
	const apiParams: GetCombinedAnalyticsRequest | null = useMemo(() => {
		const params: GetCombinedAnalyticsRequest = {
			include_time_series: true,
			include_revenue: true,
			window_size: WindowSize.HOUR,
		};

		if (customerId.trim()) {
			params.external_customer_id = customerId.trim();
		}

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
	}, [customerId, selectedFeatures, startDate, endDate]);

	// Debounced API parameters with 300ms delay
	const [debouncedApiParams, setDebouncedApiParams] = useState<GetCombinedAnalyticsRequest | null>(null);

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
		data: costData,
		isLoading: costLoading,
		error: costError,
	} = useQuery({
		queryKey: ['cost-analytics', debouncedApiParams],
		queryFn: async () => {
			if (!debouncedApiParams) {
				throw new Error('API parameters not available');
			}
			return await CostAnalyticsApi.getCombinedAnalytics(debouncedApiParams);
		},
		enabled: !!debouncedApiParams,
	});

	useEffect(() => {
		updateBreadcrumb(1, 'Usage Tracking');
		updateBreadcrumb(2, 'Cost Analytics');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const resetFilters = () => {
		setCustomerId('');
		setSelectedFeatures([]);
		setStartDate(new Date(new Date().setDate(new Date().getDate() - 7)));
		setEndDate(new Date());
	};

	if (costError) {
		toast.error('Error fetching cost data');
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
		<Page heading='Cost Analytics'>
			<ApiDocsContent tags={['Cost Analytics']} />
			<div className='space-y-6'>
				{/* Filters Section */}
				<div className='flex flex-wrap items-end gap-3'>
					<div className='min-w-[150px] max-w-[200px]'>
						<Input label='Customer ID' placeholder='External customer ID' value={customerId} onChange={setCustomerId} className='text-sm' />
					</div>
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
					<Button variant='ghost' onClick={resetFilters} className='h-10 w-10 p-0' title='Reset filters'>
						<RefreshCw className='h-4 w-4' />
					</Button>
				</div>

				{/* Summary Metrics */}
				{costLoading ? (
					<div className='flex items-center justify-center py-12'>
						<Loader />
					</div>
				) : (
					costData &&
					(() => {
						const revenue = isCombinedAnalytics(costData) ? costData.total_revenue : '0';
						const margin = isCombinedAnalytics(costData) ? costData.margin : '0';
						const marginPercent = isCombinedAnalytics(costData) ? costData.margin_percent : '0';
						const roi = isCombinedAnalytics(costData) ? costData.roi : '0';
						const roiPercent = isCombinedAnalytics(costData) ? costData.roi_percent : '0';

						const marginValue = parseFloat(margin || '0');
						const roiValue = parseFloat(roi || '0');
						const marginTextClass = marginValue >= 0 ? 'text-green-600' : 'text-red-600';
						const roiTextClass = roiValue >= 0 ? 'text-green-600' : 'text-red-600';

						return (
							<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
								{/* Revenue Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div className='absolute top-3 right-3 text-green-600 text-xs font-medium px-2 py-1 flex items-center gap-1'>
										<span>↑</span>
										<span>0%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>Revenue</p>
									<p className='text-xl font-semibold text-gray-900'>
										{formatNumber(parseFloat(revenue || '0'), 2)} {costData.currency}
									</p>
								</div>

								{/* Cost Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div className='absolute top-3 right-3 text-red-600 text-xs font-medium px-2 py-1 flex items-center gap-1'>
										<span>↑</span>
										<span>0%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>Cost</p>
									<p className='text-xl font-semibold text-gray-900'>
										{formatNumber(parseFloat(costData.total_cost || '0'), 2)} {costData.currency}
									</p>
								</div>

								{/* Margin Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div
										className={`absolute top-3 right-3 ${marginValue >= 0 ? 'text-green-600' : 'text-red-600'} text-xs font-medium px-2 py-1 flex items-center gap-1`}>
										<span>{marginValue >= 0 ? '↑' : '↓'}</span>
										<span>{formatNumber(parseFloat(marginPercent || '0'), 2)}%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>Margin</p>
									<p className={`text-xl font-semibold ${marginTextClass}`}>
										{formatNumber(marginValue, 2)} {costData.currency}
									</p>
								</div>

								{/* ROI Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div
										className={`absolute top-3 right-3 ${roiValue >= 0 ? 'text-green-600' : 'text-red-600'} text-xs font-medium px-2 py-1 flex items-center gap-1`}>
										<span>{roiValue >= 0 ? '↑' : '↓'}</span>
										<span>{formatNumber(parseFloat(roiPercent || '0'), 2)}%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>ROI</p>
									<p className={`text-xl font-semibold ${roiTextClass}`}>
										{formatNumber(roiValue, 2)} {costData.currency}
									</p>
								</div>
							</div>
						);
					})()
				)}

				{/* Cost Data Table */}
				{costLoading ? (
					<div className='mt-6'>
						<h1 className='text-lg font-medium text-gray-900 mb-4'>Cost Breakdown</h1>
						<Card>
							<div className='p-12'>
								<div className='flex items-center justify-center'>
									<Loader />
								</div>
							</div>
						</Card>
					</div>
				) : (
					costData && (
						<div className='mt-6'>
							<CostDataTable items={costData.cost_analytics} />
						</div>
					)
				)}
			</div>
		</Page>
	);
};

const CostDataTable: React.FC<{ items: CostAnalyticItem[] }> = ({ items }) => {
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

	// Prepare data for the table
	const tableData = items.map((item, index) => ({
		...item,
		// Ensure we have all required fields for the table
		id: item.meter_id || `cost-${index}`,
	}));

	return (
		<>
			<h1 className='text-lg font-medium text-gray-900 mb-4'>Cost Breakdown</h1>
			<FlexpriceTable columns={columns} data={tableData} showEmptyRow />
		</>
	);
};

export default CostAnalyticsPage;
