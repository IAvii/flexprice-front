import { AxiosClient } from '@/core/axios/verbs';
import { generateQueryParams } from '@/utils/common/api_helper';

export interface ScheduledTask {
	id: string;
	tenant_id: string;
	environment_id: string;
	connection_id: string;
	entity_type: string;
	interval: 'hourly' | 'daily';
	enabled: boolean;
	job_config: {
		bucket: string;
		region: string;
		key_prefix: string;
		compression?: string;
		encryption?: string;
		max_file_size_mb?: number;
	};
	last_run_at?: string;
	next_run_at?: string;
	last_run_status?: string;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface GetScheduledTasksPayload {
	connection_id?: string;
	limit?: number;
	offset?: number;
}

export interface GetScheduledTasksResponse {
	items: ScheduledTask[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
	};
}

export interface CreateScheduledTaskPayload {
	connection_id: string;
	entity_type: 'events' | 'invoices';
	interval: 'hourly' | 'daily';
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

class ScheduledTaskApi {
	private static baseUrl = '/tasks/scheduled';

	public static async getAllScheduledTasks(payload: GetScheduledTasksPayload = {}): Promise<GetScheduledTasksResponse> {
		const url = generateQueryParams(this.baseUrl, payload);
		return await AxiosClient.get<GetScheduledTasksResponse>(url);
	}

	public static async getScheduledTaskById(id: string): Promise<ScheduledTask> {
		return await AxiosClient.get<ScheduledTask>(`${this.baseUrl}/${id}`);
	}

	public static async createScheduledTask(payload: CreateScheduledTaskPayload): Promise<ScheduledTask> {
		return await AxiosClient.post<ScheduledTask>(this.baseUrl, payload);
	}

	public static async updateScheduledTask(id: string, payload: UpdateScheduledTaskPayload): Promise<ScheduledTask> {
		return await AxiosClient.put<ScheduledTask>(`${this.baseUrl}/${id}`, payload);
	}

	public static async deleteScheduledTask(id: string): Promise<void> {
		return await AxiosClient.delete(`${this.baseUrl}/${id}`);
	}

	public static async forceRunScheduledTask(id: string, payload?: ForceRunPayload): Promise<void> {
		return await AxiosClient.post(`${this.baseUrl}/${id}/run`, payload || {});
	}
}

export default ScheduledTaskApi;
