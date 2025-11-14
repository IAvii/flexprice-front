import { User } from '@/models';

export interface GetServiceAccountsResponse {
	items: User[];
	pagination?: {
		total: number;
		limit: number;
		offset: number;
	};
}

export interface CreateServiceAccountPayload {
	type: 'service_account';
	roles: string[];
}
