import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { Page, Card, Input, DateRangePicker, FeatureMultiSelect } from '@/components/atoms';
import CostSheetApi from '@/api/CostSheetApi';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
import { GetCostAnalyticsRequest } from '@/types/dto/Cost';
import Feature from '@/models/Feature';
import { formatNumber } from '@/utils/common';
import { ApiDocsContent } from '@/components/molecules';
import { CostDataTable } from '@/components/molecules/CostDataTable';

const CostAnalyticsPage: React.FC = () => {
	const { updateBreadcrumb } = useBreadcrumbsStore();

	// Filter states
	const [customerId, setCustomerId] = useState<string>('');
	const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
	const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)));
	const [endDate, setEndDate] = useState<Date>(new Date());

	// Prepare API parameters
	const apiParams: GetCostAnalyticsRequest | null = useMemo(() => {
		const params: GetCostAnalyticsRequest = {};

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
	const [debouncedApiParams, setDebouncedApiParams] = useState<GetCostAnalyticsRequest | null>(null);

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
			return await CostSheetApi.GetCostAnalytics(debouncedApiParams);
		},
		enabled: !!debouncedApiParams,
	});

	useEffect(() => {
		updateBreadcrumb(1, 'Usage Tracking');
		updateBreadcrumb(2, 'Cost Analytics');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
				</div>

				{/* Summary Metrics */}
				{costLoading ? (
					<div className='flex items-center justify-center py-12'>
						<Loader />
					</div>
				) : (
					costData &&
					(() => {
						const totalRevenue = parseFloat(costData.total_revenue || '0');
						const totalCost = parseFloat(costData.total_cost || '0');
						const margin = parseFloat(costData.margin || '0');
						const marginPercent = parseFloat(costData.margin_percent || '0');
						const roi = parseFloat(costData.roi || '0');
						const roiPercent = parseFloat(costData.roi_percent || '0');

						const marginColorClass = margin >= 0 ? 'text-green-600' : 'text-red-600';
						const roiColorClass = roi >= 0 ? 'text-green-600' : 'text-red-600';

						return (
							<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
								{/* Total Revenue Card */}
								<div className='bg-white border border-gray-200 p-6'>
									<p className='text-sm text-gray-600 font-normal mb-2'>Total Revenue</p>
									<p className='text-xl font-semibold text-gray-900'>
										{formatNumber(totalRevenue, 2)} {costData.currency}
									</p>
								</div>

								{/* Total Cost Card */}
								<div className='bg-white border border-gray-200 p-6'>
									<p className='text-sm text-gray-600 font-normal mb-2'>Total Cost</p>
									<p className='text-xl font-semibold text-gray-900'>
										{formatNumber(totalCost, 2)} {costData.currency}
									</p>
								</div>

								{/* Margin Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div className={`absolute top-3 right-3 ${marginColorClass} text-xs font-medium px-2 py-1 flex items-center gap-1`}>
										<span>{margin >= 0 ? '↑' : '↓'}</span>
										<span>{formatNumber(Math.abs(marginPercent), 2)}%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>Margin</p>
									<p className={`text-xl font-semibold ${marginColorClass}`}>
										{formatNumber(margin, 2)} {costData.currency}
									</p>
								</div>

								{/* ROI Card */}
								<div className='bg-white border border-gray-200 p-6 relative'>
									<div className={`absolute top-3 right-3 ${roiColorClass} text-xs font-medium px-2 py-1 flex items-center gap-1`}>
										<span>{roi >= 0 ? '↑' : '↓'}</span>
										<span>{formatNumber(Math.abs(roiPercent), 2)}%</span>
									</div>
									<p className='text-sm text-gray-600 font-normal mb-2'>ROI</p>
									<p className={`text-xl font-semibold ${roiColorClass}`}>
										{formatNumber(roi, 2)} {costData.currency}
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

export default CostAnalyticsPage;
