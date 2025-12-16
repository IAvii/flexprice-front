export interface LineItemCommitmentConfig {
	commitment_type: 'amount' | 'quantity';
	commitment_amount?: number;
	commitment_quantity?: number;
	overage_factor: number;
	enable_true_up: boolean;
	is_window_commitment: boolean;
}

export type LineItemCommitmentsMap = Record<string, LineItemCommitmentConfig>;
