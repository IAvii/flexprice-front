import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { RedirectCell } from '@/components/molecules';
import { cn } from '@/lib/utils';
import { WALLET_TRANSACTION_REASON } from '@/models/Wallet';
import { WalletTransaction } from '@/models/WalletTransaction';
import { User } from '@/models/User';
import { formatDateShort, getCurrencySymbol } from '@/utils/common/helper_functions';
import { RouteNames } from '@/core/routes/Routes';
import { FC, useMemo } from 'react';

const formatAmount = ({
	type,
	amount,
	currency,
	className,
	status,
}: {
	type: string;
	amount: number;
	currency?: string;
	className?: string;
	status?: string;
}) => {
	// Check if transaction is pending and apply yellow color
	const isPending = status?.toLowerCase() === 'pending';
	const colorClass = isPending ? 'text-[#f5c50b]' : type === 'credit' ? 'text-[#2A9D90]' : 'text-[#18181B]';

	return (
		<span className={cn(colorClass, className)}>
			{type === 'credit' ? '+' : '-'}
			{amount}
			{currency ? ` ${getCurrencySymbol(currency)}` : ' credits'}
		</span>
	);
};

const fomatTransactionTitle = ({ type, reason }: { type: string; reason: string }) => {
	switch (reason) {
		case WALLET_TRANSACTION_REASON.INVOICE_PAYMENT:
			return 'Invoice Payment';
		case WALLET_TRANSACTION_REASON.FREE_CREDIT_GRANT:
			return 'Free Credits Added';
		case WALLET_TRANSACTION_REASON.SUBSCRIPTION_CREDIT_GRANT:
			return 'Subscription Credits Added';
		case WALLET_TRANSACTION_REASON.PURCHASED_CREDIT_INVOICED:
			return 'Purchased Credits (Invoiced)';
		case WALLET_TRANSACTION_REASON.PURCHASED_CREDIT_DIRECT:
			return 'Purchased Credits';
		case WALLET_TRANSACTION_REASON.INVOICE_REFUND:
			return 'Invoice Refund';
		case WALLET_TRANSACTION_REASON.CREDIT_EXPIRED:
			return 'Credits Expired';
		case WALLET_TRANSACTION_REASON.WALLET_TERMINATION:
			return 'Wallet Terminated';
		case WALLET_TRANSACTION_REASON.CREDIT_NOTE:
			return 'Credit Note Refund';
		case WALLET_TRANSACTION_REASON.MANUAL_BALANCE_DEBIT:
			return 'Manual Debit';
		default:
			return type === 'credit' ? 'Credited' : 'Debited';
	}
};

interface Props {
	data: WalletTransaction[];
	users: User[];
}

const WalletTransactionsTable: FC<Props> = ({ data, users }) => {
	// Create a map of user IDs to user emails for quick lookup
	const userMap = useMemo(() => {
		const map = new Map<string, User>();
		users.forEach((user) => {
			map.set(user.id, user);
		});
		return map;
	}, [users]);

	const columnData: ColumnData<WalletTransaction>[] = [
		{
			title: 'Customer',
			render: (rowData) => {
				if (rowData.customer_id) {
					const customerName = rowData.customer?.name || rowData.customer?.email || rowData.customer_id;
					return <RedirectCell redirectUrl={`${RouteNames.customers}/${rowData.customer_id}`}>{customerName}</RedirectCell>;
				}
				return <span className='text-gray-400'>--</span>;
			},
		},
		{
			title: 'Transaction Reason',
			render: (rowData) => fomatTransactionTitle({ type: rowData.type, reason: rowData.transaction_reason }),
		},
		{
			title: 'Date',
			render: (rowData) => <span>{formatDateShort(rowData.created_at)}</span>,
		},
		{
			title: 'Created By',
			render: (rowData) => {
				if (rowData.created_by) {
					const user = rowData.created_by_user || userMap.get(rowData.created_by);
					if (user) {
						return <span>{user.email || user.name || rowData.created_by}</span>;
					}
					return <span className='text-gray-400 font-mono text-xs'>{rowData.created_by}</span>;
				}
				return <span className='text-gray-400'>--</span>;
			},
		},
		{
			title: 'Amount',
			align: 'right',
			render: (rowData) => {
				return (
					<span className='flex flex-col justify-center items-end'>
						{formatAmount({
							type: rowData.type,
							amount: rowData.amount,
							currency: rowData.currency,
							className: 'text-base font-medium',
							status: rowData.transaction_status,
						})}
						{rowData.credit_amount > 0 && (
							<span className='text-sm text-gray-500'>
								{formatAmount({
									type: rowData.type,
									amount: rowData.credit_amount,
									className: 'text-sm',
									status: rowData.transaction_status,
								})}
							</span>
						)}
					</span>
				);
			},
		},
	];
	return <FlexpriceTable columns={columnData} data={data} />;
};

export default WalletTransactionsTable;
