import { Pagination, CostSheet, Metadata, Price } from '@/models';
import { TypedBackendFilter, TypedBackendSort } from '../formatters/QueryBuilder';

export interface CreateCostSheetRequest {
	name: string;
	lookup_key: string;
	description?: string;
	metadata?: Metadata;
}

export interface CostSheetResponse extends CostSheet {
	prices: Price[];
}

export interface UpdateCostSheetRequest {
	name?: string;
	description?: string;
	metadata?: Metadata;
}

export interface GetCostSheetsPayload {
	end_time?: string;
	expand?: string;
	cost_sheet_ids?: string[];
	limit?: number;
	lookup_key?: string;
	offset?: number;
	order?: string;
	sort?: string;
	start_time?: string;
	status?: string;
	lookup_keys?: string[];
}

export interface GetCostSheetsResponse {
	items: CostSheetResponse[];
	pagination: Pagination;
}

export interface GetCostSheetsByFilterPayload extends Pagination {
	filters: TypedBackendFilter[];
	sort: TypedBackendSort[];
}
