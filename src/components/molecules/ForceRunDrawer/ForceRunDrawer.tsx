import { FC, useState } from 'react';
import { Button, Input, Modal } from '@/components/atoms';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ForceRunDrawerProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (startTime?: string, endTime?: string) => void;
	isLoading?: boolean;
}

const ForceRunDrawer: FC<ForceRunDrawerProps> = ({ isOpen, onOpenChange, onConfirm, isLoading }) => {
	const [runType, setRunType] = useState<'current' | 'custom'>('current');
	const [startTime, setStartTime] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [errors, setErrors] = useState<{ startTime?: string; endTime?: string }>({});

	const handleConfirm = () => {
		if (runType === 'current') {
			// Run with current interval (no time range specified)
			onConfirm();
			handleClose();
			return;
		}

		// Validate custom time range
		const newErrors: { startTime?: string; endTime?: string } = {};

		if (!startTime) {
			newErrors.startTime = 'Start time is required';
		}

		if (!endTime) {
			newErrors.endTime = 'End time is required';
		}

		if (startTime && endTime) {
			const start = new Date(startTime);
			const end = new Date(endTime);

			if (start >= end) {
				newErrors.endTime = 'End time must be after start time';
			}
		}

		setErrors(newErrors);

		if (Object.keys(newErrors).length === 0) {
			// Parse datetime-local strings and convert to UTC properly
			const startDate = new Date(startTime);
			const endDate = new Date(endTime);
			const startISO = startDate.toISOString();
			const endISO = endDate.toISOString();
			onConfirm(startISO, endISO);
			handleClose();
		}
	};

	const handleClose = () => {
		setRunType('current');
		setStartTime('');
		setEndTime('');
		setErrors({});
		onOpenChange(false);
	};

	return (
		<Modal isOpen={isOpen} onOpenChange={handleClose} className='w-full max-w-md'>
			<div className='bg-white rounded-lg shadow-xl p-6'>
				{/* Header */}
				<div className='mb-4'>
					<h2 className='text-xl font-semibold text-gray-900'>Force Run Export</h2>
					<p className='text-sm text-gray-500 mt-1'>Choose to run the export for the current interval or specify a custom time range.</p>
				</div>

				{/* Content */}
				<div className='space-y-4 py-4'>
					<RadioGroup value={runType} onValueChange={(value) => setRunType(value as 'current' | 'custom')}>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='current' id='current' />
							<Label htmlFor='current' className='font-normal cursor-pointer'>
								Run current interval
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem value='custom' id='custom' />
							<Label htmlFor='custom' className='font-normal cursor-pointer'>
								Select custom date range
							</Label>
						</div>
					</RadioGroup>

					{runType === 'custom' && (
						<div className='space-y-4 pt-2'>
							<Input
								label='Start Time'
								type='datetime-local'
								value={startTime}
								onChange={(value) => {
									setStartTime(value);
									if (errors.startTime) {
										setErrors((prev) => ({ ...prev, startTime: undefined }));
									}
								}}
								error={errors.startTime}
							/>

							<Input
								label='End Time'
								type='datetime-local'
								value={endTime}
								min={startTime}
								onChange={(value) => {
									setEndTime(value);
									if (errors.endTime) {
										setErrors((prev) => ({ ...prev, endTime: undefined }));
									}
								}}
								error={errors.endTime}
							/>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className='flex gap-2 pt-4'>
					<Button variant='outline' onClick={handleClose} disabled={isLoading} className='flex-1'>
						Cancel
					</Button>
					<Button onClick={handleConfirm} isLoading={isLoading} className='flex-1'>
						Run Export
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default ForceRunDrawer;
