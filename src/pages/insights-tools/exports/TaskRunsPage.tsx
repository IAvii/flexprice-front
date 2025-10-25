import { Page, Button } from '@/components/atoms';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TaskRunsTable from '@/components/molecules/TaskRunsTable/TaskRunsTable';
import { ApiDocsContent } from '@/components/molecules';

const TaskRunsPage = () => {
	const { connectionId, exportId } = useParams<{ connectionId: string; exportId: string }>();
	const navigate = useNavigate();

	return (
		<Page heading='Task Runs'>
			<ApiDocsContent tags={['Task Runs', 'Exports', 'Monitoring']} />

			{/* Back button */}
			<div className='mb-6'>
				<Button
					variant='outline'
					onClick={() => navigate(`/tools/exports/s3/${connectionId}/export/${exportId}`)}
					className='flex items-center gap-2'>
					<ArrowLeft className='w-4 h-4' />
					Back to Export Details
				</Button>
			</div>

			{/* Task Runs Table */}
			<div className='space-y-6'>
				<TaskRunsTable scheduledTaskId={exportId!} taskType='EXPORT' />
			</div>
		</Page>
	);
};

export default TaskRunsPage;
