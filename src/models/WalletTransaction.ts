import { Metadata } from './base';
import { Customer } from './Customer';
import { User } from './User';

export type WalletTransaction = {
	readonly amount: number;
	readonly balance_after: number;
	readonly balance_before: number;
	readonly created_at: string;
	readonly description: string;
	readonly id: string;
	readonly metadata: Metadata;
	readonly reference_id: string;
	readonly reference_type: string;
	readonly transaction_status: string;
	readonly type: string;
	readonly wallet_id: string;
	readonly credit_amount: number;
	readonly transaction_reason: string;
	readonly expiry_date: string;
	readonly priority?: number;
	readonly customer_id?: string;
	readonly created_by?: string;
	readonly customer?: Customer;
	readonly currency?: string;
	readonly created_by_user?: User;
};
