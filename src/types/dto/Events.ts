import { Event, WindowSize, UsageAnalyticItem } from '@/models';

export interface GetEventsPayload {
	external_customer_id?: string;
	event_name?: string;
	start_time?: string;
	end_time?: string;
	iter_first_key?: string;
	iter_last_key?: string;
	page_size?: number;
	event_id?: string;
	source?: string;
}

export interface GetEventsResponse {
	events: Event[];
	has_more: boolean;
	iter_first_key: string;
	iter_last_key: string;
}

export interface GetUsageByMeterPayload {
	meter_id: string;
	end_time?: string;
	start_time?: string;
	external_customer_id?: string;
	filters?: Record<string, string[]>;
	window_size?: string;
}

export interface GetUsageByMeterResponse {
	type: string;
	event_name: string;
	results: {
		window_size: string;
		value: number;
	}[];
}

export interface FireEventsPayload {
	customer_id?: string;
	subscription_id?: string;
	feature_id?: string;
	duration?: number;
	amount?: number;
}

// Analytics DTOs
export interface GetUsageAnalyticsRequest {
	external_customer_id: string;
	feature_ids?: string[];
	sources?: string[];
	start_time?: string;
	end_time?: string;
	group_by?: string[]; // allowed values: "source", "feature_id", "properties.<field_name>"
	window_size?: WindowSize;
	expand?: string[]; // allowed values: "price", "meter", "feature", "subscription_line_item","plan","addon"
	property_filters?: Record<string, string[]>;
}

export interface GetUsageAnalyticsResponse {
	total_cost: number;
	currency: string;
	items: UsageAnalyticItem[];
}
