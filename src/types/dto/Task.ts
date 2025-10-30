import { ImportTask, Pagination, Metadata, ScheduledTask, ScheduledEntityType, ScheduledTaskInterval } from '@/models';

export interface AddTaskPayload {
	entity_type: string;
	file_type: string;
	file_url: string;
	task_type: string;
	file_name?: string;
	metadata?: Metadata;
}

export interface GetTasksPayload {
	created_by?: string;
	end_time?: string;
	expand?: string;
	limit?: number;
	offset?: number;
	order?: string;
	sort?: string;
	start_time?: string;
	status?: string;
	task_status?: string;
	task_type?: string;
}

export interface GetTasksResponse {
	items: ImportTask[];
	pagination: Pagination;
}

// Scheduled Task DTOs
export interface GetScheduledTasksPayload {
	connection_id?: string;
	limit?: number;
	offset?: number;
}

export interface GetScheduledTasksResponse {
	items: ScheduledTask[];
	pagination: Pagination;
}

export interface CreateScheduledTaskPayload {
	connection_id: string;
	entity_type: ScheduledEntityType;
	interval: ScheduledTaskInterval;
	enabled: boolean;
	job_config: {
		bucket: string;
		region: string;
		key_prefix: string;
		compression?: string;
		encryption?: string;
		max_file_size_mb?: number;
	};
}

export interface UpdateScheduledTaskPayload {
	enabled: boolean;
}

export interface ForceRunPayload {
	start_time?: string;
	end_time?: string;
}
