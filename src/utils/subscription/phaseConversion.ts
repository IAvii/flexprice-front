import { PhaseFormData } from '@/components/organisms/Subscription/PhaseForm';
import { SubscriptionPhaseCreateRequest, OverrideLineItemRequest } from '@/types/dto/Subscription';
import { Coupon } from '@/models/Coupon';
import { ExtendedPriceOverride } from '@/utils/common/price_override_helpers';

/**
 * Converts subscription-level data to PhaseFormData format
 * Used when converting subscription fields to the first phase
 */
export const convertSubscriptionToPhaseData = (subscriptionData: {
	startDate: string;
	endDate?: string;
	linkedCoupon: Coupon | null;
	lineItemCoupons: Record<string, Coupon>;
	priceOverrides: Record<string, ExtendedPriceOverride>;
}): PhaseFormData => {
	return {
		start_date: new Date(subscriptionData.startDate),
		end_date: subscriptionData.endDate ? new Date(subscriptionData.endDate) : null,
		coupons: subscriptionData.linkedCoupon ? [subscriptionData.linkedCoupon] : [],
		line_item_coupons: subscriptionData.lineItemCoupons,
		priceOverrides: subscriptionData.priceOverrides,
		metadata: {},
	};
};

/**
 * Extracts subscription start and end dates from phases array
 * Returns the first phase's start date and last phase's end date
 */
export const extractSubscriptionBoundaries = (
	phases: SubscriptionPhaseCreateRequest[],
): {
	startDate: string;
	endDate?: string;
} => {
	if (phases.length === 0) {
		throw new Error('Cannot extract boundaries from empty phases array');
	}

	const startDate = phases[0].start_date;
	const lastPhase = phases[phases.length - 1];
	const endDate = lastPhase.end_date;

	return {
		startDate,
		endDate,
	};
};

/**
 * Extracts first phase data to be merged into subscription-level payload
 * Returns coupons, line_item_coupons, and override_line_items from first phase
 */
export const extractFirstPhaseData = (
	phases: SubscriptionPhaseCreateRequest[],
): {
	coupons?: string[];
	line_item_coupons?: Record<string, string[]>;
	override_line_items?: OverrideLineItemRequest[];
} => {
	if (phases.length === 0) {
		return {};
	}

	const firstPhase = phases[0];

	return {
		coupons: firstPhase.coupons,
		line_item_coupons: firstPhase.line_item_coupons,
		override_line_items: firstPhase.override_line_items,
	};
};

/**
 * Creates an empty PhaseFormData for a new phase
 * Start date is set to the provided date (usually previous phase's end date or subscription start)
 */
export const createEmptyPhaseData = (startDate: Date): PhaseFormData => {
	return {
		start_date: startDate,
		end_date: null,
		coupons: [],
		line_item_coupons: {},
		priceOverrides: {},
		metadata: {},
	};
};
