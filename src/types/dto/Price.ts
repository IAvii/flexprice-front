import { BILLING_CADENCE, INVOICE_CADENCE } from '@/constants';
import {
	Price,
	BILLING_MODEL,
	BILLING_PERIOD,
	PRICE_TYPE,
	PRICE_UNIT_TYPE,
	TIER_MODE,
	PRICE_ENTITY_TYPE,
	Plan,
	Addon,
	Feature,
	Meter,
	Metadata,
	Pagination,
} from '@/models';
import { QueryFilter, TimeRangeFilter } from './base';

export interface CreateBulkPriceRequest {
	items: CreatePriceRequest[];
}

export interface GetAllPricesResponse extends Pagination {
	items: Price[];
}

export interface PriceFilter extends QueryFilter, TimeRangeFilter {
	price_ids?: string[];
	entity_type?: PRICE_ENTITY_TYPE;
	entity_ids?: string[];
	subscription_id?: string;
	parent_price_id?: string;
	meter_ids?: string[];
	start_date_lt?: string; // ISO date string
}

export interface CreatePriceRequest {
	amount?: string;
	currency: string;
	plan_id?: string; // TODO: This is deprecated and will be removed in the future
	entity_type?: PRICE_ENTITY_TYPE; // TODO: this will be required in the future as we will not allow prices to be created without an entity type
	entity_id?: string; // TODO: this will be required in the future as we will not allow prices to be created without an entity id
	type: PRICE_TYPE;
	price_unit_type: PRICE_UNIT_TYPE;
	billing_period: BILLING_PERIOD;
	billing_period_count?: number;
	billing_model: BILLING_MODEL;
	billing_cadence: BILLING_CADENCE;
	meter_id?: string;
	filter_values?: Record<string, string[]>;
	lookup_key?: string;
	invoice_cadence: INVOICE_CADENCE;
	trial_period?: number;
	description?: string;
	metadata?: Metadata;
	tier_mode?: TIER_MODE;
	tiers?: CreatePriceTier[];
	transform_quantity?: TransformQuantity;
	price_unit_config?: PriceUnitConfig;
	start_date?: string; // ISO date string
	end_date?: string; // ISO date string
	group_id?: string;
}

export interface GetPriceResponse extends Price {
	plan: Plan;
	addon: Addon;
	feature: Feature;
	meter: Meter;
}

export interface CreatePriceTier {
	// up_to is the quantity up to which this tier applies. It is null for the last tier.
	// IMPORTANT: Tier boundaries are INCLUSIVE.
	// - If up_to is 1000, then quantity less than or equal to 1000 belongs to this tier
	// - This behavior is consistent across both VOLUME and SLAB tier modes
	up_to?: number | null;
	unit_amount: string;
	flat_amount?: string;
}

export interface PriceUnitConfig {
	amount?: string;
	price_unit: string;
	price_unit_tiers?: CreatePriceTier[];
}

export interface TransformQuantity {
	divide_by: number;
	round?: 'up' | 'down';
}

// Additional DTOs for bulk operations and responses
export interface CreateBulkPriceResponse {
	items: Price[];
}

// Response types for individual price operations
export interface PriceResponse extends Price {
	pricing_unit?: PriceUnitResponse;
	meter?: Meter;
	plan?: Plan;
	addon?: Addon;
}

export interface PriceUnitResponse {
	// Add price unit response fields as needed
	id: string;
	name: string;
	// Add other fields based on backend response
}

// Delete price request
export interface DeletePriceRequest {
	end_date?: string; // ISO date string
}

// Cost breakup for detailed pricing information
export interface CostBreakup {
	// EffectiveUnitCost is the per-unit cost based on the applicable tier
	effective_unit_cost: string;
	// SelectedTierIndex is the index of the tier that was applied (-1 if no tiers)
	selected_tier_index: number;
	// TierUnitAmount is the unit amount of the selected tier
	tier_unit_amount: string;
	// FinalCost is the total cost for the quantity
	final_cost: string;
}

export interface UpdatePriceRequest {
	// Non-critical fields (can be updated directly)
	lookup_key?: string;
	description?: string;
	metadata?: Metadata;
	effective_from?: string; // ISO date string

	// Critical fields (require creating a new price)
	billing_model?: BILLING_MODEL;
	amount?: string;
	tier_mode?: TIER_MODE;
	tiers?: CreatePriceTier[];
	transform_quantity?: TransformQuantity;
}
