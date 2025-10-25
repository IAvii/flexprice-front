import { AxiosClient } from '@/core/axios/verbs';
import { generateQueryParams } from '@/utils/common/api_helper';

export interface ExportRun {
	id: string;
	scheduled_task_id: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	started_at?: string;
	completed_at?: string;
	error_message?: string;
	records_processed?: number;
	records_exported?: number;
	file_size_bytes?: number;
	file_path?: string;
	created_at: string;
	updated_at: string;
}

export interface GetExportRunsPayload {
	scheduled_task_id?: string;
	status?: string;
	limit?: number;
	offset?: number;
}

export interface GetExportRunsResponse {
	items: ExportRun[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
	};
}

class ExportRunApi {
	private static baseUrl = '/export-runs';

	public static async getAllExportRuns(payload: GetExportRunsPayload = {}): Promise<GetExportRunsResponse> {
		const url = generateQueryParams(this.baseUrl, payload);
		return await AxiosClient.get<GetExportRunsResponse>(url);
	}

	public static async getExportRunById(id: string): Promise<ExportRun> {
		return await AxiosClient.get<ExportRun>(`${this.baseUrl}/${id}`);
	}

	public static async getExportRunsByTaskId(
		taskId: string,
		payload: Omit<GetExportRunsPayload, 'scheduled_task_id'> = {},
	): Promise<GetExportRunsResponse> {
		return await this.getAllExportRuns({ ...payload, scheduled_task_id: taskId });
	}
}

export default ExportRunApi;
