import { Price } from '@/models/Price';
import { CommitmentType, LineItemCommitmentConfig, LineItemCommitmentsMap } from '@/types/dto/LineItemCommitmentConfig';

/**
 * Check if a price has commitment configured
 */
export const hasCommitment = (priceId: string, commitments: LineItemCommitmentsMap): boolean => {
	return commitments[priceId] !== undefined;
};

/**
 * Get commitment config for a specific price
 */
export const getCommitmentConfig = (priceId: string, commitments: LineItemCommitmentsMap): LineItemCommitmentConfig | undefined => {
	return commitments[priceId];
};

/**
 * Validate commitment configuration
 * Returns error message if invalid, null if valid
 */
export const validateCommitment = (config: Partial<LineItemCommitmentConfig>): string | null => {
	if (!config.commitment_type) {
		return 'Commitment type is required';
	}

	if (config.commitment_type === CommitmentType.AMOUNT) {
		if (config.commitment_amount === undefined || config.commitment_amount === null) {
			return 'Commitment amount is required when type is "amount"';
		}
		if (config.commitment_amount <= 0) {
			return 'Commitment amount must be greater than 0';
		}
	}

	if (config.commitment_type === CommitmentType.QUANTITY) {
		if (config.commitment_quantity === undefined || config.commitment_quantity === null) {
			return 'Commitment quantity is required when type is "quantity"';
		}
		if (config.commitment_quantity <= 0) {
			return 'Commitment quantity must be greater than 0';
		}
	}

	if (config.overage_factor === undefined || config.overage_factor === null) {
		return 'Overage factor is required';
	}

	if (config.overage_factor < 0) {
		return 'Overage factor must be non-negative';
	}

	if (config.enable_true_up === undefined || config.enable_true_up === null) {
		return 'Enable true up is required';
	}

	if (config.is_window_commitment === undefined || config.is_window_commitment === null) {
		return 'Is window commitment is required';
	}

	return null;
};

/**
 * Format commitment configuration for display
 */
export const formatCommitmentSummary = (config: LineItemCommitmentConfig): string => {
	const parts: string[] = [];

	if (config.commitment_type === CommitmentType.AMOUNT) {
		parts.push(`$${config.commitment_amount?.toLocaleString() || '0'} commitment`);
	} else {
		parts.push(`${config.commitment_quantity?.toLocaleString() || '0'} units commitment`);
	}

	if (config.overage_factor && config.overage_factor !== 1) {
		parts.push(`${config.overage_factor}x overage`);
	}

	if (config.enable_true_up) {
		parts.push('true-up enabled');
	}

	if (config.is_window_commitment) {
		parts.push('windowed');
	}

	return parts.join(' • ');
};

/**
 * Check if a price/meter supports window commitment
 * Window commitment is only available for meters with bucket_size configured
 */
export const supportsWindowCommitment = (price: Price): boolean => {
	return price.meter?.aggregation?.bucket_size !== undefined && price.meter?.aggregation?.bucket_size !== null;
};

/**
 * Extract line item commitments from price overrides
 * Converts the frontend ExtendedPriceOverride format to backend LineItemCommitmentsMap
 */
export const extractLineItemCommitments = (
	priceOverrides: Record<string, { commitment?: LineItemCommitmentConfig }>,
): LineItemCommitmentsMap => {
	const commitments: LineItemCommitmentsMap = {};

	Object.entries(priceOverrides).forEach(([priceId, override]) => {
		if (override.commitment) {
			commitments[priceId] = override.commitment;
		}
	});

	return commitments;
};

/**
 * Merge line item commitments into price overrides
 * Used when loading existing subscription data
 */
export const mergeCommitmentsIntoOverrides = (
	priceOverrides: Record<string, any>,
	commitments: LineItemCommitmentsMap,
): Record<string, any> => {
	const merged = { ...priceOverrides };

	Object.entries(commitments).forEach(([priceId, commitment]) => {
		if (merged[priceId]) {
			merged[priceId] = {
				...merged[priceId],
				commitment,
			};
		} else {
			merged[priceId] = {
				price_id: priceId,
				commitment,
			};
		}
	});

	return merged;
};
