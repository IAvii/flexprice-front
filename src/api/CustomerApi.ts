import { AxiosClient } from '@/core/axios/verbs';
import { Customer, Pagination, Subscription } from '@/models';
import {
	GetCustomerResponse,
	GetCustomerByFiltersPayload,
	GetCustomerSubscriptionsResponse,
	GetCustomerEntitlementPayload,
	GetUsageSummaryResponse,
	GetCustomerEntitlementsResponse,
	CreateCustomerRequest,
	UpdateCustomerRequest,
	ListCreditGrantApplicationsResponse,
} from '@/types/dto';
import { generateQueryParams } from '@/utils/common/api_helper';
import { TypedBackendFilter } from '@/types/formatters/QueryBuilder';
import { DataType, FilterOperator } from '@/types/common/QueryBuilder';

class CustomerApi {
	private static baseUrl = '/customers';

	public static async getCustomerById(id: string): Promise<Customer> {
		return await AxiosClient.get(`${this.baseUrl}/${id}`);
	}
	public static async getAllCustomers({ limit = 10, offset = 0 }: Pagination): Promise<GetCustomerResponse> {
		const url = generateQueryParams(this.baseUrl, { limit, offset });
		return await AxiosClient.get(url);
	}

	public static async getCustomersByFilters(payload: GetCustomerByFiltersPayload): Promise<GetCustomerResponse> {
		return await AxiosClient.post(`${this.baseUrl}/search`, payload);
	}

	public static async deleteCustomerById(id: string): Promise<void> {
		return await AxiosClient.delete(`${this.baseUrl}/${id}`);
	}

	public static async getCustomerSubscriptions(id: string): Promise<GetCustomerSubscriptionsResponse> {
		return await AxiosClient.get(`/subscriptions?customer_id=${id}`);
	}

	public static async getCustomerSubscriptionById(id: string): Promise<Subscription> {
		return await AxiosClient.get(`/subscriptions/${id}`);
	}

	public static async createCustomer(customer: CreateCustomerRequest): Promise<Customer> {
		return await AxiosClient.post(`${this.baseUrl}`, customer);
	}

	public static async updateCustomer(customer: UpdateCustomerRequest, id: string): Promise<Customer> {
		return await AxiosClient.put(`${this.baseUrl}/${id}`, customer);
	}

	public static async getEntitlements(payload: GetCustomerEntitlementPayload): Promise<GetCustomerEntitlementsResponse> {
		return await AxiosClient.get(`${this.baseUrl}/${payload.customer_id}/entitlements`);
	}

	public static async getUsageSummary(payload: GetCustomerEntitlementPayload): Promise<GetUsageSummaryResponse> {
		return await AxiosClient.get(`${this.baseUrl}/${payload.customer_id}/usage`);
	}

	/**
	 * Get upcoming credit grant applications for a customer
	 */
	public static async getUpcomingCreditGrantApplications(customerId: string): Promise<ListCreditGrantApplicationsResponse> {
		return await AxiosClient.get<ListCreditGrantApplicationsResponse>(`${this.baseUrl}/${customerId}/grants/upcoming`);
	}

	/**
	 * Search customers by query string (searches name and email)
	 * If query is empty, returns all customers
	 * @param query - Search query string (can be empty)
	 * @param limit - Maximum number of results (default: 20)
	 * @returns Promise with customer search results
	 */
	public static async searchCustomers(query: string, limit: number = 20): Promise<GetCustomerResponse> {
		// If query is empty, return all customers without filters
		if (!query || query.trim() === '') {
			return await this.getCustomersByFilters({
				limit,
				offset: 0,
				filters: [],
				sort: [],
			});
		}

		// Create filters for name and email contains search
		const filters: TypedBackendFilter[] = [
			{
				field: 'name',
				operator: FilterOperator.CONTAINS,
				data_type: DataType.STRING,
				value: { string: query },
			},
			{
				field: 'email',
				operator: FilterOperator.CONTAINS,
				data_type: DataType.STRING,
				value: { string: query },
			},
		];

		return await this.getCustomersByFilters({
			limit,
			offset: 0,
			filters,
			sort: [],
		});
	}
}

export default CustomerApi;
