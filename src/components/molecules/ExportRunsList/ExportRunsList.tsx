import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import ExportRunApi, { ExportRun } from '@/api/ExportRunApi';
import { FormHeader, Loader } from '@/components/atoms';
import { CheckCircle, XCircle, Clock, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportRunsListProps {
	taskId: string;
	limit?: number;
}

const ExportRunsList: FC<ExportRunsListProps> = ({ taskId, limit = 10 }) => {
	const { data: runsResponse, isLoading } = useQuery({
		queryKey: ['export-runs', taskId, limit],
		queryFn: () => ExportRunApi.getExportRunsByTaskId(taskId, { limit }),
	});

	const runs = runsResponse?.items || [];

	if (isLoading) {
		return <Loader />;
	}

	if (runs.length === 0) {
		return (
			<div className='card text-center py-8'>
				<Clock className='w-12 h-12 mx-auto mb-4 text-gray-300' />
				<h3 className='text-lg font-medium text-gray-900 mb-2'>No Export Runs</h3>
				<p className='text-gray-500'>This export task hasn't run yet.</p>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<FormHeader variant='form-component-title' title='Recent Export Runs' />
			<div className='card'>
				{runs.map((run) => (
					<ExportRunItem key={run.id} run={run} />
				))}
			</div>
		</div>
	);
};

interface ExportRunItemProps {
	run: ExportRun;
}

const ExportRunItem: FC<ExportRunItemProps> = ({ run }) => {
	const getStatusIcon = (status: ExportRun['status']) => {
		switch (status) {
			case 'completed':
				return <CheckCircle className='w-4 h-4 text-green-500' />;
			case 'failed':
				return <XCircle className='w-4 h-4 text-red-500' />;
			case 'running':
				return <Play className='w-4 h-4 text-blue-500' />;
			case 'pending':
				return <Clock className='w-4 h-4 text-yellow-500' />;
			case 'cancelled':
				return <AlertCircle className='w-4 h-4 text-gray-500' />;
			default:
				return <Clock className='w-4 h-4 text-gray-500' />;
		}
	};

	const getStatusColor = (status: ExportRun['status']) => {
		switch (status) {
			case 'completed':
				return 'text-green-700 bg-green-50';
			case 'failed':
				return 'text-red-700 bg-red-50';
			case 'running':
				return 'text-blue-700 bg-blue-50';
			case 'pending':
				return 'text-yellow-700 bg-yellow-50';
			case 'cancelled':
				return 'text-gray-700 bg-gray-50';
			default:
				return 'text-gray-700 bg-gray-50';
		}
	};

	const formatFileSize = (bytes?: number) => {
		if (!bytes) return 'N/A';
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString();
	};

	return (
		<div className='flex items-center justify-between text-sm p-4 border-b last:border-b-0'>
			<div className='flex-1'>
				<div className='flex items-center gap-3'>
					{getStatusIcon(run.status)}
					<div>
						<div className='flex items-center gap-2'>
							<span className='font-medium capitalize'>{run.status}</span>
							<span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(run.status))}>{run.status}</span>
						</div>
						<div className='text-xs text-gray-500 mt-1'>
							{run.started_at ? `Started: ${formatDate(run.started_at)}` : 'Not started'}
							{run.completed_at && ` • Completed: ${formatDate(run.completed_at)}`}
						</div>
						{run.error_message && <div className='text-xs text-red-600 mt-1'>Error: {run.error_message}</div>}
					</div>
				</div>
			</div>
			<div className='flex items-center gap-4 text-xs text-gray-500'>
				{run.records_processed !== undefined && (
					<div>
						<span className='font-medium'>{run.records_processed}</span> processed
					</div>
				)}
				{run.records_exported !== undefined && (
					<div>
						<span className='font-medium'>{run.records_exported}</span> exported
					</div>
				)}
				{run.file_size_bytes && (
					<div>
						<span className='font-medium'>{formatFileSize(run.file_size_bytes)}</span>
					</div>
				)}
			</div>
		</div>
	);
};

export default ExportRunsList;
