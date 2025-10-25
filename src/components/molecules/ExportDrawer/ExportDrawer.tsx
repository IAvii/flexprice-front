import { FC, useState, useEffect } from 'react';
import { Button, Input, Sheet, Spacer, Select } from '@/components/atoms';
import { useMutation } from '@tanstack/react-query';
import ScheduledTaskApi, { ScheduledTask, CreateScheduledTaskPayload } from '@/api/ScheduledTaskApi';
import toast from 'react-hot-toast';

interface ExportDrawerProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	connectionId: string;
	exportTask?: ScheduledTask | null; // for editing
	onSave: (exportTask: any) => void;
}

interface ExportFormData {
	entity_type: 'events' | 'invoices';
	interval: 'hourly' | 'daily';
	enabled: boolean;
	bucket: string;
	region: string;
	key_prefix: string;
	compression: string;
	encryption: string;
}

interface ValidationErrors {
	entity_type?: string;
	interval?: string;
	bucket?: string;
	region?: string;
	key_prefix?: string;
}

const ExportDrawer: FC<ExportDrawerProps> = ({ isOpen, onOpenChange, connectionId, exportTask, onSave }) => {
	const [formData, setFormData] = useState<ExportFormData>({
		entity_type: 'events',
		interval: 'hourly',
		enabled: true,
		bucket: '',
		region: 'us-east-1',
		key_prefix: 'flexprice-exports',
		compression: 'none',
		encryption: 'AES256',
	});

	const [errors, setErrors] = useState<ValidationErrors>({});

	// Initialize form data when editing
	useEffect(() => {
		if (exportTask) {
			setFormData({
				entity_type: exportTask.entity_type as 'events' | 'invoices',
				interval: exportTask.interval,
				enabled: exportTask.enabled,
				bucket: exportTask.job_config.bucket,
				region: exportTask.job_config.region,
				key_prefix: exportTask.job_config.key_prefix,
				compression: exportTask.job_config.compression || 'none',
				encryption: exportTask.job_config.encryption || 'AES256',
			});
		} else {
			setFormData({
				entity_type: 'events',
				interval: 'hourly',
				enabled: true,
				bucket: '',
				region: 'us-east-1',
				key_prefix: 'flexprice-exports',
				compression: 'none',
				encryption: 'AES256',
			});
		}
		setErrors({});
	}, [exportTask, isOpen]);

	const handleChange = (field: keyof ExportFormData, value: string | number | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field as keyof ValidationErrors]) {
			setErrors((prev) => ({ ...prev, [field as keyof ValidationErrors]: undefined }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: ValidationErrors = {};

		if (!formData.bucket.trim()) {
			newErrors.bucket = 'S3 bucket name is required';
		}

		if (!formData.region.trim()) {
			newErrors.region = 'AWS region is required';
		}

		if (!formData.key_prefix.trim()) {
			newErrors.key_prefix = 'Key prefix is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const { mutate: createExport, isPending: isCreating } = useMutation({
		mutationFn: async () => {
			const payload: CreateScheduledTaskPayload = {
				connection_id: connectionId,
				entity_type: formData.entity_type,
				interval: formData.interval,
				enabled: formData.enabled,
				job_config: {
					bucket: formData.bucket,
					region: formData.region,
					key_prefix: formData.key_prefix,
					compression: formData.compression,
					encryption: formData.encryption,
				},
			};

			return await ScheduledTaskApi.createScheduledTask(payload);
		},
		onSuccess: (response) => {
			toast.success('Export task created successfully');
			onSave(response);
			onOpenChange(false);
		},
		onError: (error: any) => {
			toast.error(error?.message || 'Failed to create export task');
		},
	});

	const { mutate: updateExport, isPending: isUpdating } = useMutation({
		mutationFn: async () => {
			const payload: CreateScheduledTaskPayload = {
				connection_id: connectionId,
				entity_type: formData.entity_type,
				interval: formData.interval,
				enabled: formData.enabled,
				job_config: {
					bucket: formData.bucket,
					region: formData.region,
					key_prefix: formData.key_prefix,
					compression: formData.compression,
					encryption: formData.encryption,
				},
			};

			return await ScheduledTaskApi.updateScheduledTask(exportTask!.id, payload);
		},
		onSuccess: (response) => {
			toast.success('Export task updated successfully');
			onSave(response);
			onOpenChange(false);
		},
		onError: (error: any) => {
			toast.error(error?.message || 'Failed to update export task');
		},
	});

	const handleSave = () => {
		if (validateForm()) {
			if (exportTask) {
				updateExport();
			} else {
				createExport();
			}
		}
	};

	const isPending = isCreating || isUpdating;

	return (
		<Sheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title={exportTask ? 'Edit Export Task' : 'Create Export Task'}
			description="Configure the export settings for your S3 data pipeline. Click save when you're done."
			size='lg'>
			<div className='space-y-4 mt-4'>
				{/* Entity Type */}
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-2'>Entity Type</label>
					<Select
						value={formData.entity_type}
						onChange={(value) => handleChange('entity_type', value as 'events' | 'invoices')}
						error={errors.entity_type}
						options={[
							{ value: 'events', label: 'Events' },
							{ value: 'invoice', label: 'Invoice' },
						]}
					/>
					<p className='text-xs text-gray-500 mt-1'>Select the type of data to export</p>
				</div>

				{/* Interval */}
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-2'>Export Interval</label>
					<Select
						value={formData.interval}
						onChange={(value) => handleChange('interval', value as 'hourly' | 'daily')}
						error={errors.interval}
						options={[
							{ value: 'hourly', label: 'Hourly' },
							{ value: 'daily', label: 'Daily' },
						]}
					/>
					<p className='text-xs text-gray-500 mt-1'>How often to run the export</p>
				</div>

				{/* S3 Bucket */}
				<Input
					label='S3 Bucket Name'
					placeholder='Enter S3 bucket name'
					value={formData.bucket}
					onChange={(value) => handleChange('bucket', value)}
					error={errors.bucket}
					description='The name of your S3 bucket'
				/>

				{/* AWS Region */}
				<Input
					label='AWS Region'
					placeholder='Enter AWS region'
					value={formData.region}
					onChange={(value) => handleChange('region', value)}
					error={errors.region}
					description='The AWS region where your S3 bucket is located'
				/>

				{/* Key Prefix */}
				<Input
					label='Key Prefix'
					placeholder='Enter key prefix'
					value={formData.key_prefix}
					onChange={(value) => handleChange('key_prefix', value)}
					error={errors.key_prefix}
					description='The prefix for files in your S3 bucket'
				/>

				{/* Compression */}
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-2'>Compression</label>
					<Select
						value={formData.compression}
						onChange={(value) => handleChange('compression', value)}
						options={[
							{ value: 'none', label: 'None' },
							{ value: 'gzip', label: 'GZIP' },
						]}
					/>
					<p className='text-xs text-gray-500 mt-1'>Compression format for exported files</p>
				</div>

				{/* Encryption */}
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-2'>Encryption</label>
					<Select
						value={formData.encryption}
						onChange={(value) => handleChange('encryption', value)}
						options={[{ value: 'AES256', label: 'AES256' }]}
					/>
					<p className='text-xs text-gray-500 mt-1'>Encryption method for exported files</p>
				</div>

				{/* Enabled */}
				<div className='flex items-center space-x-2'>
					<input
						type='checkbox'
						id='enabled'
						checked={formData.enabled}
						onChange={(e) => handleChange('enabled', e.target.checked)}
						className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
					/>
					<label htmlFor='enabled' className='text-sm font-medium text-gray-700'>
						Enable this export task
					</label>
				</div>

				<Spacer className='!h-4' />
				<div className='flex gap-2'>
					<Button variant='outline' onClick={() => onOpenChange(false)} className='flex-1'>
						Cancel
					</Button>
					<Button onClick={handleSave} className='flex-1' isLoading={isPending}>
						{exportTask ? 'Update' : 'Create'}
					</Button>
				</div>
			</div>
		</Sheet>
	);
};

export default ExportDrawer;
