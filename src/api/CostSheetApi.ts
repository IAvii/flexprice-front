import { AxiosClient } from '@/core/axios/verbs';
import { CostSheet } from '@/models';
import { generateQueryParams } from '@/utils/common/api_helper';
import {
	CreateCostSheetRequest,
	UpdateCostSheetRequest,
	GetCostSheetsPayload,
	GetCostSheetsResponse,
	GetCostSheetsByFilterPayload,
	CostSheetResponse,
} from '@/types/dto';
import { GetCostAnalyticsRequest, GetDetailedCostAnalyticsResponse } from '@/types/dto/Cost';

class CostSheetApi {
	private static baseUrl = '/costs';

	public static async ListCostSheets(payload: GetCostSheetsPayload = {}): Promise<GetCostSheetsResponse> {
		const url = generateQueryParams(this.baseUrl, {
			...payload,
			expand: 'prices',
		});
		return await AxiosClient.get<GetCostSheetsResponse>(url);
	}

	public static async GetCostSheetById(id: string) {
		return await AxiosClient.get<CostSheetResponse>(`${this.baseUrl}/${id}`);
	}

	public static async GetCostSheetByLookupKey(lookupKey: string) {
		return await AxiosClient.get<CostSheetResponse>(`${this.baseUrl}/lookup/${lookupKey}`);
	}

	public static async CreateCostSheet(data: CreateCostSheetRequest) {
		return await AxiosClient.post<CostSheet, CreateCostSheetRequest>(this.baseUrl, data);
	}

	public static async UpdateCostSheet(id: string, data: UpdateCostSheetRequest) {
		return await AxiosClient.put<CostSheet, UpdateCostSheetRequest>(`${this.baseUrl}/${id}`, data);
	}

	public static async DeleteCostSheet(id: string) {
		return await AxiosClient.delete<void>(`${this.baseUrl}/${id}`);
	}

	public static async GetCostSheetsByFilter(payload: GetCostSheetsByFilterPayload) {
		return await AxiosClient.post<GetCostSheetsResponse, GetCostSheetsByFilterPayload>(`${this.baseUrl}/search`, payload);
	}

	public static async GetActiveCostSheetForTenant() {
		return await AxiosClient.get<CostSheetResponse>(`${this.baseUrl}/active`);
	}

	/**
	 * Get detailed cost analytics for customers and costsheets
	 * @Summary Get combined revenue and cost analytics
	 * @Description Retrieve combined analytics with ROI, margin, and detailed breakdowns. If start_time and end_time are not provided, defaults to last 7 days.
	 * @param payload Cost analytics request (start_time/end_time optional - defaults to last 7 days)
	 * @returns Detailed cost analytics response with revenue, margin, ROI
	 */
	public static async GetCostAnalytics(payload: GetCostAnalyticsRequest): Promise<GetDetailedCostAnalyticsResponse> {
		return await AxiosClient.post<GetDetailedCostAnalyticsResponse>(`${this.baseUrl}/analytics`, payload);
	}
}

export default CostSheetApi;
