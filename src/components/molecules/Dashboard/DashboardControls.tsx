'use client';

import { Select } from '@/components/atoms';
import { WindowSize } from '@/models';
import { TIME_PERIOD } from '@/constants/constants';

const timePeriodOptions = [
	{ value: TIME_PERIOD.LAST_HOUR, label: 'Last hour' },
	{ value: TIME_PERIOD.LAST_DAY, label: 'Last day' },
	{ value: TIME_PERIOD.LAST_WEEK, label: 'Last week' },
	{ value: TIME_PERIOD.LAST_30_DAYS, label: 'Last 30 days' },
];

const windowSizeOptions = [
	{ value: WindowSize.MINUTE, label: 'Minute' },
	{ value: WindowSize.FIFTEEN_MIN, label: '15 Minutes' },
	{ value: WindowSize.THIRTY_MIN, label: '30 Minutes' },
	{ value: WindowSize.HOUR, label: 'Hour' },
	{ value: WindowSize.THREE_HOUR, label: '3 Hours' },
	{ value: WindowSize.SIX_HOUR, label: '6 Hours' },
	{ value: WindowSize.TWELVE_HOUR, label: '12 Hours' },
	{ value: WindowSize.DAY, label: 'Day' },
	{ value: WindowSize.WEEK, label: 'Week' },
	{ value: WindowSize.MONTH, label: 'Month' },
];

interface DashboardControlsProps {
	timePeriod: TIME_PERIOD;
	windowSize: WindowSize;
	onTimePeriodChange: (period: TIME_PERIOD) => void;
	onWindowSizeChange: (size: WindowSize) => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({ timePeriod, windowSize, onTimePeriodChange, onWindowSizeChange }) => {
	return (
		<div className='flex flex-col sm:flex-row gap-4 sm:justify-end mb-6'>
			<div className='flex flex-col sm:flex-row gap-4'>
				<div className='flex flex-col gap-1'>
					<label className='text-xs font-medium text-gray-600'>Time Period</label>
					<Select
						value={timePeriod}
						options={timePeriodOptions}
						onChange={(value) => onTimePeriodChange(value as TIME_PERIOD)}
						className='min-w-[150px]'
					/>
				</div>
				<div className='flex flex-col gap-1'>
					<label className='text-xs font-medium text-gray-600'>Window Size</label>
					<Select
						value={windowSize}
						options={windowSizeOptions}
						onChange={(value) => onWindowSizeChange(value as WindowSize)}
						className='min-w-[150px]'
					/>
				</div>
			</div>
		</div>
	);
};

export default DashboardControls;
