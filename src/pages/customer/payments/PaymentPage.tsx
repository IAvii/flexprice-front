import { useQuery } from '@tanstack/react-query';
import PaymentApi from '@/api/PaymentApi';
import usePagination from '@/hooks/usePagination';
import { Loader } from '@/components/atoms';
import toast from 'react-hot-toast';
import { ApiDocsContent, FlatTabs } from '@/components/molecules';
import { Page } from '@/components/atoms';
import { EmptyPage } from '@/components/organisms';
import GUIDES from '@/constants/guides';
import PaymentList from './PaymentList';
import WalletTransactionList from './WalletTransactionList';

const PaymentPage = () => {
	const { limit, offset, page } = usePagination();

	const {
		data: payments,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['payments', page],
		queryFn: () => PaymentApi.getAllPayments({ limit, offset }),
	});

	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		toast.error('Error fetching payments');
	}

	if ((payments?.items ?? []).length === 0) {
		return (
			<EmptyPage
				heading='Payments'
				emptyStateCard={{
					heading: 'Record Your First Payment',
					description: 'Add a payment record to manage customer charges and settlements.',
				}}
				tutorials={GUIDES.payments.tutorials}
				tags={['Payments']}
			/>
		);
	}

	return (
		<Page heading='Payments'>
			<ApiDocsContent tags={['Payments', 'Auth']} />
			<FlatTabs
				tabs={[
					{
						value: 'payments',
						label: 'Payments',
						content: <PaymentList />,
					},
					{
						value: 'wallet-transactions',
						label: 'Wallet Transactions',
						content: <WalletTransactionList />,
					},
				]}
			/>
		</Page>
	);
};

export default PaymentPage;
