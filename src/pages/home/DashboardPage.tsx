import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Page, Loader, Select } from '@/components/atoms';
import EventsApi from '@/api/EventsApi';
import toast from 'react-hot-toast';
import { GetUsageAnalyticsRequest } from '@/types';
import { WindowSize } from '@/models';
import { CustomerUsageChart } from '@/components/molecules';

type TimePeriod = 'last-hour' | 'last-day' | 'last-week' | 'last-30-days';

const timePeriodOptions = [
	{ value: 'last-hour', label: 'Last hour' },
	{ value: 'last-day', label: 'Last day' },
	{ value: 'last-week', label: 'Last week' },
	{ value: 'last-30-days', label: 'Last 30 days' },
];

const getTimeRangeForPeriod = (period: TimePeriod): { startDate: Date; endDate: Date } => {
	const endDate = new Date();
	let startDate = new Date();

	switch (period) {
		case 'last-hour':
			startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
			break;
		case 'last-day':
			startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
			break;
		case 'last-week':
			startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case 'last-30-days':
			startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
	}

	return { startDate, endDate };
};

const getWindowSizeForPeriod = (period: TimePeriod): WindowSize => {
	switch (period) {
		case 'last-hour':
			return WindowSize.MINUTE;
		case 'last-day':
			return WindowSize.HOUR;
		case 'last-week':
			return WindowSize.DAY;
		case 'last-30-days':
			return WindowSize.DAY;
		default:
			return WindowSize.DAY;
	}
};

const DashboardPage = () => {
	const [timePeriod, setTimePeriod] = useState<TimePeriod>('last-week');

	// Calculate date range based on selected time period
	const { startDate, endDate } = useMemo(() => {
		return getTimeRangeForPeriod(timePeriod);
	}, [timePeriod]);

	// Get window size based on period
	const windowSize = useMemo(() => {
		return getWindowSizeForPeriod(timePeriod);
	}, [timePeriod]);

	// Prepare Usage API parameters
	// Note: external_customer_id is required by the API
	// For dashboard view, you may need to:
	// 1. Provide a specific customer_id, or
	// 2. Aggregate across all customers, or
	// 3. Use a different endpoint that supports global analytics
	// For now, leaving it as a placeholder - adjust based on your API requirements
	const usageApiParams: GetUsageAnalyticsRequest | null = useMemo(() => {
		// TODO: Add customer_id or adjust based on your dashboard requirements
		// Example: const customerId = 'your-customer-id';
		// if (!customerId) return null;

		// Uncomment and adjust when you have customer_id or global endpoint:
		// const params: GetUsageAnalyticsRequest = {
		// 	external_customer_id: customerId, // or remove if API supports global
		// 	window_size: windowSize,
		// };
		// if (startDate) params.start_time = startDate.toISOString();
		// if (endDate) params.end_time = endDate.toISOString();
		// return params;

		return null; // Disabled until customer_id or global endpoint is configured
	}, [startDate, endDate, windowSize]);

	// Debounced API parameters with 300ms delay
	const [debouncedUsageParams, setDebouncedUsageParams] = useState<GetUsageAnalyticsRequest | null>(null);

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

	const {
		data: usageData,
		isLoading: usageLoading,
		error: usageError,
	} = useQuery({
		queryKey: ['usage', 'dashboard', debouncedUsageParams],
		queryFn: async () => {
			if (!debouncedUsageParams) {
				throw new Error('API parameters not available');
			}
			return await EventsApi.getUsageAnalytics(debouncedUsageParams);
		},
		enabled: !!debouncedUsageParams,
	});

	useEffect(() => {
		if (usageError) {
			toast.error('Error fetching usage data');
		}
	}, [usageError]);

	const isLoading = usageLoading;

	// Format "Updated just now" timestamp
	const getUpdatedTime = () => {
		return 'Updated just now';
	};

	return (
		<Page heading='Home'>
			<div className='space-y-6'>
				{/* Graph Section with Time Period Selector */}
				<div className='relative'>
					{/* Time Period Selector - Positioned top right */}
					<div className='absolute top-0 right-0 z-10'>
						<Select
							value={timePeriod}
							options={timePeriodOptions}
							onChange={(value) => setTimePeriod(value as TimePeriod)}
							className='min-w-[150px]'
						/>
					</div>

					{/* Usage Chart */}
					{isLoading ? (
						<div className='flex items-center justify-center py-12'>
							<Loader />
						</div>
					) : (
						usageData && (
							<div className='mt-2'>
								<CustomerUsageChart data={usageData} title='Events ingested' description={getUpdatedTime()} />
							</div>
						)
					)}
				</div>
			</div>
		</Page>
	);
};

export default DashboardPage;
