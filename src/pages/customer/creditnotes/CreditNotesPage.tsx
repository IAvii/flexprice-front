import { Page, Spacer, Loader, ShortPagination } from '@/components/atoms';
import { CreditNoteTable } from '@/components/molecules/CreditNoteTable';
import { ApiDocsContent } from '@/components/molecules';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import usePagination from '@/hooks/usePagination';
import CreditNoteApi from '@/api/CreditNoteApi';
import { EmptyPage } from '@/components/organisms';
import GUIDES from '@/constants/guides';

const CreditNotesPage = () => {
	const { limit, offset, page } = usePagination();

	const fetchCreditNotes = async () => {
		return await CreditNoteApi.getCreditNotes({
			limit,
			offset,
			expand: 'invoice,customer',
		});
	};

	const {
		data: creditNoteData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['fetchCreditNotes', page],
		queryFn: fetchCreditNotes,
	});

	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		toast.error('Error fetching credit notes');
	}

	if ((creditNoteData?.items ?? []).length === 0) {
		return (
			<EmptyPage
				heading='Credit Notes'
				tags={['Credit Notes']}
				tutorials={GUIDES.creditNotes?.tutorials || []}
				emptyStateCard={{
					heading: 'Issue A Credit Note',
					description: 'Add a credit note to adjust or refund customer invoices.',
				}}
			/>
		);
	}

	return (
		<Page heading='Credit Notes'>
			<ApiDocsContent tags={['Credit Notes']} />
			<div className='px-0'>
				<CreditNoteTable data={creditNoteData?.items || []} />
				<Spacer className='!h-4' />
				<ShortPagination unit='Credit Notes' totalItems={creditNoteData?.pagination.total ?? 0} />
			</div>
		</Page>
	);
};

export default CreditNotesPage;
