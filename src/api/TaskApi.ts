import { AxiosClient } from '@/core/axios/verbs';
import { ImportTask, ScheduledTask } from '@/models';
import { generateQueryParams } from '@/utils/common/api_helper';
import {
	GetTasksPayload,
	GetTasksResponse,
	AddTaskPayload,
	GetScheduledTasksPayload,
	GetScheduledTasksResponse,
	CreateScheduledTaskPayload,
	UpdateScheduledTaskPayload,
	ForceRunPayload,
} from '@/types/dto';

class TaskApi {
	private static baseUrl = '/tasks';
	private static scheduledBaseUrl = '/tasks/scheduled';

	// Regular Task Methods
	public static async addTask(data: AddTaskPayload) {
		return await AxiosClient.post<ImportTask, AddTaskPayload>(`${this.baseUrl}`, data);
	}

	public static async getTaskById(id: string): Promise<ImportTask> {
		return await AxiosClient.get(`${this.baseUrl}/${id}`);
	}

	public static async getAllTasks(payload: GetTasksPayload = {}): Promise<GetTasksResponse> {
		const url = generateQueryParams(this.baseUrl, payload);
		return await AxiosClient.get(url);
	}

	// Scheduled Task Methods
	public static async getAllScheduledTasks(payload: GetScheduledTasksPayload = {}): Promise<GetScheduledTasksResponse> {
		const url = generateQueryParams(this.scheduledBaseUrl, payload);
		return await AxiosClient.get<GetScheduledTasksResponse>(url);
	}

	public static async getScheduledTaskById(id: string): Promise<ScheduledTask> {
		return await AxiosClient.get<ScheduledTask>(`${this.scheduledBaseUrl}/${id}`);
	}

	public static async createScheduledTask(payload: CreateScheduledTaskPayload): Promise<ScheduledTask> {
		return await AxiosClient.post<ScheduledTask>(this.scheduledBaseUrl, payload);
	}

	public static async updateScheduledTask(id: string, payload: UpdateScheduledTaskPayload): Promise<ScheduledTask> {
		return await AxiosClient.put<ScheduledTask>(`${this.scheduledBaseUrl}/${id}`, payload);
	}

	public static async deleteScheduledTask(id: string): Promise<void> {
		return await AxiosClient.delete(`${this.scheduledBaseUrl}/${id}`);
	}

	public static async forceRunScheduledTask(id: string, payload?: ForceRunPayload): Promise<void> {
		return await AxiosClient.post(`${this.scheduledBaseUrl}/${id}/run`, payload || {});
	}
}

export default TaskApi;
