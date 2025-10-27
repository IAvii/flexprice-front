import { AxiosClient } from '@/core/axios/verbs';
import { generateQueryParams } from '@/utils/common/api_helper';
import {
	GetEventsPayload,
	GetEventsResponse,
	GetUsageByMeterPayload,
	GetUsageByMeterResponse,
	FireEventsPayload,
	GetUsageAnalyticsRequest,
	GetUsageAnalyticsResponse,
} from '@/types/dto';

class EventsApi {
	private static baseUrl = '/events';

	public static async getRawEvents(payload: GetEventsPayload): Promise<GetEventsResponse> {
		const url = generateQueryParams(EventsApi.baseUrl, payload);
		return await AxiosClient.get<GetEventsResponse>(url);
	}

	public static async getUsageByMeter(payload: GetUsageByMeterPayload): Promise<GetUsageByMeterResponse> {
		return await AxiosClient.post<GetUsageByMeterResponse>(`${EventsApi.baseUrl}/usage/meter`, {
			...payload,
		});
	}

	public static async fireEvents(payload: FireEventsPayload): Promise<void> {
		return await AxiosClient.post<void>(`/portal/onboarding/events`, {
			...payload,
		});
	}

	/**
	 * Get usage analytics (v1 - with feature flag support)
	 * This endpoint uses feature flags to determine whether to use v1 or v2 backend
	 */
	public static async getUsageAnalytics(payload: GetUsageAnalyticsRequest): Promise<GetUsageAnalyticsResponse> {
		return await AxiosClient.post<GetUsageAnalyticsResponse>(`${EventsApi.baseUrl}/analytics`, payload);
	}

	/**
	 * Get usage analytics v2 (direct v2 backend call)
	 * This endpoint directly calls the v2 backend without feature flag logic
	 */
	public static async getUsageAnalyticsV2(payload: GetUsageAnalyticsRequest): Promise<GetUsageAnalyticsResponse> {
		return await AxiosClient.post<GetUsageAnalyticsResponse>(`${EventsApi.baseUrl}/analytics-v2`, payload);
	}
}

export default EventsApi;
