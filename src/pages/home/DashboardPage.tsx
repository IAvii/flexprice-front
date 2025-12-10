import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Page, Loader } from '@/components/atoms';
import EventsApi from '@/api/EventsApi';
import EnvironmentApi from '@/api/EnvironmentApi';
import toast from 'react-hot-toast';
import { GetMonitoringDataRequest } from '@/types';
import { WindowSize } from '@/models';
import { TIME_PERIOD } from '@/constants/constants';
import {
	EventsMonitoringChart,
	DashboardControls,
	RecentSubscriptionsCard,
	RevenueTrendCard,
	InvoiceIssuesCard,
} from '@/components/molecules';
import { useRecentSubscriptions, useRevenueData, useInvoiceIssues } from '@/hooks/useDashboardData';

const getTimeRangeForPeriod = (period: TIME_PERIOD): { startDate: Date; endDate: Date } => {
	const endDate = new Date();
	let startDate = new Date();

	switch (period) {
		case TIME_PERIOD.LAST_HOUR:
			startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
			break;
		case TIME_PERIOD.LAST_DAY:
			startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
			break;
		case TIME_PERIOD.LAST_WEEK:
			startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case TIME_PERIOD.LAST_30_DAYS:
			startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
	}

	return { startDate, endDate };
};

const DashboardPage = () => {
	const [timePeriod, setTimePeriod] = useState<TIME_PERIOD>(TIME_PERIOD.LAST_WEEK);
	const [windowSize, setWindowSize] = useState<WindowSize>(WindowSize.HOUR);

	// Calculate date range based on selected time period
	const { startDate, endDate } = useMemo(() => {
		return getTimeRangeForPeriod(timePeriod);
	}, [timePeriod]);

	// Prepare Monitoring API parameters
	const monitoringApiParams: GetMonitoringDataRequest = useMemo(() => {
		const params: GetMonitoringDataRequest = {
			window_size: windowSize,
		};
		if (startDate) params.start_time = startDate.toISOString();
		if (endDate) params.end_time = endDate.toISOString();
		return params;
	}, [startDate, endDate, windowSize]);

	// Debounced API parameters with 300ms delay
	const [debouncedMonitoringParams, setDebouncedMonitoringParams] = useState<GetMonitoringDataRequest | null>(null);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedMonitoringParams(monitoringApiParams);
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [monitoringApiParams]);

	const environmentId = EnvironmentApi.getActiveEnvironmentId();

	const {
		data: monitoringData,
		isLoading: monitoringLoading,
		error: monitoringError,
	} = useQuery({
		queryKey: ['monitoring', 'dashboard', environmentId, debouncedMonitoringParams],
		queryFn: async () => {
			if (!debouncedMonitoringParams) {
				throw new Error('Monitoring API parameters not available');
			}
			return await EventsApi.getMonitoringData(debouncedMonitoringParams);
		},
		enabled: !!debouncedMonitoringParams && !!environmentId,
		refetchInterval: 30000, // Refetch every 30 seconds for real-time monitoring
		staleTime: 0, // No caching
		gcTime: 0, // No garbage collection time
		refetchOnWindowFocus: true,
		refetchOnMount: true,
	});

	useEffect(() => {
		if (monitoringError) {
			toast.error('Error fetching monitoring data');
		}
	}, [monitoringError]);

	// Use custom hooks for data fetching
	const { subscriptionsCount, subscriptionsByPlan, isLoading: subscriptionsLoading, error: subscriptionsError } = useRecentSubscriptions();
	const { revenueData, isLoading: revenueLoading, error: revenueError } = useRevenueData();
	const { invoicesByStatus, pastDueSubscriptions, isLoading: invoiceIssuesLoading, errors: invoiceErrors } = useInvoiceIssues();

	// Format "Updated just now" timestamp
	const getUpdatedTime = () => {
		return 'Updated just now';
	};

	// Handle errors
	useEffect(() => {
		if (subscriptionsError) toast.error('Error fetching subscription data');
		if (revenueError) toast.error('Error fetching revenue data');
		invoiceErrors.forEach(() => toast.error('Error fetching invoice data'));
	}, [subscriptionsError, revenueError, invoiceErrors]);

	return (
		<Page
			heading='Home'
			headingCTA={
				<DashboardControls
					timePeriod={timePeriod}
					windowSize={windowSize}
					onTimePeriodChange={setTimePeriod}
					onWindowSizeChange={setWindowSize}
				/>
			}>
			<div className='space-y-6'>
				{/* Events Monitoring Chart */}
				<div>
					{monitoringLoading ? (
						<div className='flex items-center justify-center py-12 border rounded-lg'>
							<Loader />
						</div>
					) : (
						monitoringData && <EventsMonitoringChart data={monitoringData} title='Events Monitoring' description={getUpdatedTime()} />
					)}
				</div>

				{/* Business Metrics Cards */}
				<div className='space-y-6 mt-6'>
					{/* Revenue Trend Card - Full Width */}
					<RevenueTrendCard revenueData={revenueData} isLoading={revenueLoading} />

					{/* Recent Subscriptions and Invoice Payment Status - Side by Side */}
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
						<RecentSubscriptionsCard
							subscriptionsCount={subscriptionsCount}
							subscriptionsByPlan={subscriptionsByPlan}
							isLoading={subscriptionsLoading}
						/>

						<InvoiceIssuesCard
							invoicesByStatus={invoicesByStatus}
							pastDueSubscriptions={pastDueSubscriptions}
							isLoading={invoiceIssuesLoading}
						/>
					</div>
				</div>
			</div>
		</Page>
	);
};

export default DashboardPage;
