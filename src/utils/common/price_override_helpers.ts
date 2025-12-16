import { Price } from '@/models/Price';
import { BILLING_MODEL, TIER_MODE, CreatePriceTier, TransformQuantity, PRICE_TYPE } from '@/models/Price';
import { LineItemCommitmentConfig } from '@/types/dto/LineItemCommitmentConfig';

/**
 * Interface for line item overrides that will be sent to the backend
 */
// Frontend interface (supports SLAB_TIERED)
export interface SubscriptionLineItemOverrideRequest {
	price_id: string;
	quantity?: number;
	amount?: number;
	billing_model?: BILLING_MODEL | 'SLAB_TIERED';
	tier_mode?: TIER_MODE;
	tiers?: CreatePriceTier[];
	transform_quantity?: TransformQuantity;
}

// Backend interface (converted format)
export interface BackendSubscriptionLineItemOverrideRequest {
	price_id: string;
	quantity?: number;
	amount?: number;
	billing_model?: BILLING_MODEL;
	tier_mode?: TIER_MODE;
	tiers?: CreatePriceTier[];
	transform_quantity?: TransformQuantity;
}

/**
 * Extended interface for frontend price overrides
 */
export interface ExtendedPriceOverride {
	price_id: string;
	amount?: string;
	quantity?: number;
	billing_model?: BILLING_MODEL | 'SLAB_TIERED';
	tier_mode?: TIER_MODE;
	tiers?: CreatePriceTier[];
	transform_quantity?: TransformQuantity;
	effective_from?: string; // ISO date string for scheduling price changes
	commitment?: LineItemCommitmentConfig; // Commitment configuration for this price
}

/**
 * Check if a price has been overridden
 */
export const isPriceOverridden = (priceId: string, overriddenPrices: Record<string, ExtendedPriceOverride>): boolean => {
	return overriddenPrices[priceId] !== undefined;
};

/**
 * Get the current amount for a price (original or overridden)
 */
export const getCurrentPriceAmount = (price: Price, overriddenPrices: Record<string, ExtendedPriceOverride>): string => {
	const override = overriddenPrices[price.id];
	return override?.amount || price.amount;
};

/**
 * Get all overridden prices as line item overrides for backend submission
 *
 * IMPORTANT: For USAGE type prices, quantity should never be sent in line item overrides.
 * Usage-based prices calculate quantity dynamically from meter usage, so including a static
 * quantity override would conflict with the usage-based billing model.
 */
export const getLineItemOverrides = (
	prices: Price[],
	overriddenPrices: Record<string, ExtendedPriceOverride>,
): BackendSubscriptionLineItemOverrideRequest[] => {
	return Object.entries(overriddenPrices)
		.filter(([priceId, override]) => {
			const price = prices.find((p) => p.id === priceId);
			return (
				price &&
				(override.amount !== undefined ||
					override.quantity !== undefined ||
					override.billing_model !== undefined ||
					override.tier_mode !== undefined ||
					override.tiers !== undefined ||
					override.transform_quantity !== undefined)
			);
		})
		.map(([priceId, override]) => {
			const price = prices.find((p) => p.id === priceId);
			const isUsagePrice = price?.type === PRICE_TYPE.USAGE;

			// Handle SLAB_TIERED and Volume Tiered conversion
			let billingModel = override.billing_model;
			let tierMode = override.tier_mode;

			if (override.billing_model === 'SLAB_TIERED') {
				billingModel = BILLING_MODEL.TIERED;
				tierMode = TIER_MODE.SLAB;
			} else if (override.billing_model === BILLING_MODEL.TIERED) {
				// Ensure volume tiered has VOLUME tier mode
				tierMode = TIER_MODE.VOLUME;
			}

			return {
				price_id: priceId,
				...(override.amount !== undefined && { amount: parseFloat(override.amount) }),
				// Exclude quantity for USAGE type prices - quantity is determined by meter usage
				...(override.quantity !== undefined && !isUsagePrice && { quantity: override.quantity }),
				...(billingModel !== undefined && { billing_model: billingModel as BILLING_MODEL }),
				...(tierMode !== undefined && { tier_mode: tierMode }),
				...(override.tiers !== undefined && { tiers: override.tiers }),
				...(override.transform_quantity !== undefined && { transform_quantity: override.transform_quantity }),
			} as BackendSubscriptionLineItemOverrideRequest;
		});
};

/**
 * Check if there are any price overrides
 */
export const hasPriceOverrides = (overriddenPrices: Record<string, ExtendedPriceOverride>): boolean => {
	return Object.keys(overriddenPrices).length > 0;
};

/**
 * Get the count of overridden prices
 */
export const getOverriddenPricesCount = (overriddenPrices: Record<string, ExtendedPriceOverride>): number => {
	return Object.keys(overriddenPrices).length;
};

/**
 * Get a summary of price overrides for display
 */
export const getPriceOverridesSummary = (_: Price[], overriddenPrices: Record<string, ExtendedPriceOverride>): string => {
	const overriddenCount = getOverriddenPricesCount(overriddenPrices);
	if (overriddenCount === 0) return '';
	return `${overriddenCount} price${overriddenCount > 1 ? 's' : ''} overridden`;
};

/**
 * Create a new price override
 */
export const createPriceOverride = (priceId: string, override: Partial<ExtendedPriceOverride>): ExtendedPriceOverride => {
	return {
		price_id: priceId,
		...override,
	};
};

/**
 * Update an existing price override
 */
export const updatePriceOverride = (
	priceId: string,
	overrides: Record<string, ExtendedPriceOverride>,
	updates: Partial<ExtendedPriceOverride>,
): Record<string, ExtendedPriceOverride> => {
	return {
		...overrides,
		[priceId]: {
			...overrides[priceId],
			...updates,
		},
	};
};

/**
 * Remove a price override
 */
export const removePriceOverride = (
	priceId: string,
	overrides: Record<string, ExtendedPriceOverride>,
): Record<string, ExtendedPriceOverride> => {
	const newOverrides = { ...overrides };
	delete newOverrides[priceId];
	return newOverrides;
};
