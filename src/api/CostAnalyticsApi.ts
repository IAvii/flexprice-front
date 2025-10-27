import { AxiosClient } from '@/core/axios/verbs';
import {
	GetCostAnalyticsRequest,
	GetCostAnalyticsResponse,
	GetCombinedAnalyticsRequest,
	GetCombinedAnalyticsResponse,
} from '@/types/dto/CostAnalytics';

class CostAnalyticsApi {
	private static baseUrl = '/analytics';

	/**
	 * Get cost analytics for customers and costsheets
	 * @Summary Get cost analytics
	 * @Description Retrieve cost analytics with breakdown by meter, customer, and time. If start_time and end_time are not provided, defaults to last 7 days.
	 * @param payload Cost analytics request (start_time/end_time optional - defaults to last 7 days)
	 * @returns Cost analytics response
	 */
	public static async getCostAnalytics(payload: GetCostAnalyticsRequest): Promise<GetCostAnalyticsResponse> {
		return await AxiosClient.post<GetCostAnalyticsResponse>(`${this.baseUrl}/cost`, payload);
	}

	/**
	 * Get combined cost and revenue analytics with derived metrics
	 * @Summary Get combined revenue and cost analytics
	 * @Description Retrieve combined analytics with ROI, margin, and detailed breakdowns. If start_time and end_time are not provided, defaults to last 7 days.
	 * @param payload Combined analytics request (start_time/end_time optional - defaults to last 7 days)
	 * @returns Combined analytics response with ROI, margin, and cost analytics
	 */
	public static async getCombinedAnalytics(payload: GetCombinedAnalyticsRequest): Promise<GetCombinedAnalyticsResponse> {
		return await AxiosClient.post<GetCombinedAnalyticsResponse>(`${this.baseUrl}/combined`, payload);
	}
}

export default CostAnalyticsApi;
