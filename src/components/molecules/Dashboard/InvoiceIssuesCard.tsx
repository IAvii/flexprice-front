'use client';

import { Loader } from '@/components/atoms';
import { AlertCircle, FileText, Users } from 'lucide-react';

interface Invoice {
	amount_remaining?: number;
	amount_due?: number;
	currency?: string;
}

interface Subscription {
	id: string;
}

interface InvoiceIssuesCardProps {
	failedPaymentInvoices: Invoice[];
	pastDueSubscriptions: Subscription[];
	isLoading: boolean;
}

export const InvoiceIssuesCard: React.FC<InvoiceIssuesCardProps> = ({ failedPaymentInvoices, pastDueSubscriptions, isLoading }) => {
	const totalAmountDue = failedPaymentInvoices?.reduce((sum, inv) => sum + (inv.amount_remaining || inv.amount_due || 0), 0) || 0;
	const currency = failedPaymentInvoices?.[0]?.currency || 'USD';
	const totalIssues = (failedPaymentInvoices?.length || 0) + (pastDueSubscriptions?.length || 0);

	return (
		<div className='bg-white border border-[#E5E7EB] rounded-md shadow-sm overflow-hidden'>
			<div className='p-6 border-b border-[#E5E7EB]'>
				<div className='flex items-center justify-between mb-2'>
					<h3 className='text-base font-semibold text-[#111827]'>Invoice Issues</h3>
					<AlertCircle className='w-5 h-5 text-red-600' />
				</div>
				<p className='text-xs text-[#6B7280]'>Requires attention</p>
			</div>
			<div className='p-6'>
				{isLoading ? (
					<div className='flex items-center justify-center py-8'>
						<Loader />
					</div>
				) : (
					<div className='space-y-4'>
						{/* Failed Payments */}
						<div className='bg-red-50 border border-red-200 rounded-lg p-4'>
							<div className='flex items-center justify-between mb-2'>
								<div className='flex items-center gap-2'>
									<FileText className='w-4 h-4 text-red-600' />
									<p className='text-sm font-medium text-red-900'>Payment Failed</p>
								</div>
								<span className='text-2xl font-bold text-red-600'>{failedPaymentInvoices?.length || 0}</span>
							</div>
							<p className='text-xs text-red-700'>Invoices with failed payment attempts</p>
							{failedPaymentInvoices && failedPaymentInvoices.length > 0 && (
								<div className='mt-3 pt-3 border-t border-red-200'>
									<p className='text-xs font-medium text-red-900 mb-2'>Total Amount Due:</p>
									<p className='text-lg font-bold text-red-600'>
										{new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: currency,
										}).format(totalAmountDue)}
									</p>
								</div>
							)}
						</div>

						{/* Past Due Subscriptions */}
						<div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
							<div className='flex items-center justify-between mb-2'>
								<div className='flex items-center gap-2'>
									<Users className='w-4 h-4 text-orange-600' />
									<p className='text-sm font-medium text-orange-900'>Past Due</p>
								</div>
								<span className='text-2xl font-bold text-orange-600'>{pastDueSubscriptions?.length || 0}</span>
							</div>
							<p className='text-xs text-orange-700'>Subscriptions with overdue payments</p>
							{pastDueSubscriptions && pastDueSubscriptions.length > 0 && (
								<div className='mt-3 pt-3 border-t border-orange-200'>
									<p className='text-xs text-orange-700'>
										{pastDueSubscriptions.length} subscription{pastDueSubscriptions.length !== 1 ? 's' : ''} need immediate attention
									</p>
								</div>
							)}
						</div>

						{/* Summary */}
						<div className='pt-3 mt-2'>
							<div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
								<p className='text-sm font-medium text-[#4B5563]'>Total Issues</p>
								<p className='text-2xl font-bold text-[#111827]'>{totalIssues}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default InvoiceIssuesCard;
