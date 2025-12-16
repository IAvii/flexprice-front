export enum CommitmentType {
	AMOUNT = 'amount',
	QUANTITY = 'quantity',
}

export interface LineItemCommitmentConfig {
	commitment_type: CommitmentType;
	commitment_amount?: number;
	commitment_quantity?: number;
	overage_factor: number;
	enable_true_up: boolean;
	is_window_commitment: boolean;
}

export type LineItemCommitmentsMap = Record<string, LineItemCommitmentConfig>;
