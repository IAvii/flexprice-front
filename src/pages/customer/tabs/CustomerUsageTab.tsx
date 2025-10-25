import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { Card, Loader, FeatureMultiSelect, Input, Button, DateTimePicker, Select } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import toast from 'react-hot-toast';
import EventsApi from '@/api/EventsApi';
import Feature from '@/models/Feature';
import { RefreshCw } from 'lucide-react';
import { GetUsageAnalyticsRequest } from '@/types/dto';
import { WindowSize } from '@/models';
import CustomerUsageChart from '@/components/molecules/CustomerUsageChart';

const windowSizeOptions = [
	{ label: 'Minute', value: WindowSize.MINUTE },
	{ label: '15 Minute', value: WindowSize.FIFTEEN_MIN },
	{ label: '30 Minute', value: WindowSize.THIRTY_MIN },
	{ label: 'Hour', value: WindowSize.HOUR },
	{ label: '3 Hour', value: WindowSize.THREE_HOUR },
	{ label: '6 Hour', value: WindowSize.SIX_HOUR },
	{ label: '12 Hour', value: WindowSize.TWELVE_HOUR },
	{ label: 'Day', value: WindowSize.DAY },
	{ label: 'Week', value: WindowSize.WEEK },
];

const CustomerUsageTab = () => {
	const { id: customerId } = useParams();
	const { updateBreadcrumb } = useBreadcrumbsStore();

	// Filter states
	const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
	const [sources, setSources] = useState<string>('');
	const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 7)));
	const [endDate, setEndDate] = useState<Date>(new Date());
	const [windowSize, setWindowSize] = useState<WindowSize>(WindowSize.HOUR);

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
		};

		if (selectedFeatures.length > 0) {
			params.feature_ids = selectedFeatures.map((f) => f.id);
		}

		if (sources.trim()) {
			params.sources = sources
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s);
		}

		if (startDate) {
			params.start_time = startDate.toISOString();
		}

		if (endDate) {
			params.end_time = endDate.toISOString();
		}

		if (windowSize) {
			params.window_size = windowSize;
		}

		return params;
	}, [customer?.external_id, selectedFeatures, sources, startDate, endDate, windowSize]);

	// Debounced API parameters with 400ms delay
	const [debouncedApiParams, setDebouncedApiParams] = useState<GetUsageAnalyticsRequest | null>(null);

	useEffect(() => {
		if (apiParams) {
			const timeoutId = setTimeout(() => {
				setDebouncedApiParams(apiParams);
			}, 400);

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

	const resetFilters = () => {
		setSelectedFeatures([]);
		setSources('');
		setStartDate(new Date(new Date().setDate(new Date().getDate() - 7)));
		setEndDate(new Date());
		setWindowSize(WindowSize.HOUR);
	};

	if (customerLoading || usageLoading) {
		return <Loader />;
	}

	if (customerError || usageError) {
		toast.error('Error fetching usage data');
	}

	const handleStartDateChange = (date: Date | undefined) => {
		if (date) {
			setStartDate(date);
		}
	};

	const handleEndDateChange = (date: Date | undefined) => {
		if (date) {
			setEndDate(date);
		}
	};

	return (
		<div className='space-y-6'>
			{/* Usage Data Display with Filters */}
			<Card className='overflow-visible'>
				<div className='p-6 pb-0'>
					<div className='flex flex-col space-y-4'>
						<div className='flex items-center justify-between'>
							<h3 className='text-lg font-medium text-gray-900'>Usage Analytics</h3>
							<div className='flex items-center space-x-2'>
								<Button variant='ghost' size='sm' onClick={resetFilters} className='h-8 px-2 text-xs text-gray-500 hover:text-gray-700'>
									<RefreshCw className='h-3.5 w-3.5 mr-1' />
									Reset
								</Button>
							</div>
						</div>

						{/* Compact Filter Section */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pb-4 border-b border-gray-100'>
							<div className='col-span-1 lg:col-span-2'>
								<FeatureMultiSelect
									label='Features'
									placeholder='Select features'
									values={selectedFeatures.map((f) => f.id)}
									onChange={setSelectedFeatures}
									className='text-sm'
								/>
							</div>
							<div className='col-span-1'>
								<Input label='Sources' placeholder='Enter sources' value={sources} onChange={setSources} className='text-sm' />
							</div>
							<div className='col-span-1'>
								<Select
									label='Window Size'
									className='w-full text-sm'
									onChange={(value) => setWindowSize(value as WindowSize)}
									value={windowSize}
									options={windowSizeOptions.map((option) => ({ label: option.label, value: option.value }))}
								/>
							</div>
						</div>

						{/* Date Range Selection */}
						<div className='flex flex-wrap items-center gap-3 pb-4'>
							<div className='flex items-center gap-2'>
								<DateTimePicker title='From' date={startDate} setDate={handleStartDateChange} placeholder='Start date' />
								<span className='text-gray-400 flex items-center px-2'>→</span>
								<DateTimePicker title='To' date={endDate} setDate={handleEndDateChange} placeholder='End date' />
							</div>
						</div>
					</div>
				</div>

				{/* Chart Display */}
				<div className='px-2'>
					{usageData ? (
						<CustomerUsageChart
							data={usageData}
							title={`${customer?.name || 'Customer'} Usage`}
							description={`Data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`}
							className='border-0 shadow-none'
						/>
					) : (
						<div className='flex items-center justify-center h-[400px] text-center text-muted-foreground'>
							{usageLoading ? (
								<div className='flex flex-col items-center gap-2'>
									<Loader />
									<span>Loading usage data...</span>
								</div>
							) : (
								<div className='flex flex-col items-center gap-2'>
									<svg
										xmlns='http://www.w3.org/2000/svg'
										width='24'
										height='24'
										viewBox='0 0 24 24'
										fill='none'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
										className='text-gray-300'>
										<path d='M3 3v18h18'></path>
										<path d='m19 9-5 5-4-4-3 3'></path>
									</svg>
									<span>No usage data available</span>
								</div>
							)}
						</div>
					)}
				</div>
			</Card>
		</div>
	);
};

export default CustomerUsageTab;
