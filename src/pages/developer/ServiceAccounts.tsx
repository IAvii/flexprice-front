import { Button, Page, ShortPagination, SectionHeader } from '@/components/atoms';
import { ColumnData, FlexpriceTable, ApiDocsContent } from '@/components/molecules';
import { UserApi } from '@/api/UserApi';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/models';
import usePagination from '@/hooks/usePagination';
import { formatDateShort } from '@/utils/common/helper_functions';
import { Plus, Loader, Bot } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { EmptyPage } from '@/components/organisms';
import ServiceAccountDrawer from '@/components/molecules/ServiceAccountDrawer/ServiceAccountDrawer';

const ServiceAccountsPage = () => {
	const { page, limit, offset } = usePagination();
	const [isServiceAccountDrawerOpen, setIsServiceAccountDrawerOpen] = useState(false);

	const {
		data: serviceAccountsResponse,
		isLoading: isLoadingServiceAccounts,
		isError: isServiceAccountsError,
	} = useQuery({
		queryKey: ['service-accounts', page, limit, offset],
		queryFn: async () => {
			const response = await UserApi.getServiceAccounts();
			// Manually paginate since the API returns all items
			const start = offset;
			const end = offset + limit;
			const paginatedItems = response.slice(start, end);
			return {
				items: paginatedItems,
				pagination: {
					total: response.length,
					limit,
					offset,
				},
			};
		},
	});

	const handleAddServiceAccount = () => {
		setIsServiceAccountDrawerOpen(true);
	};

	// Service accounts table columns (without delete action)
	const serviceAccountColumns: ColumnData<User>[] = [
		{
			title: 'ID',
			render(rowData: User) {
				const displayId = rowData.id;
				const prefix = displayId.slice(0, 8);
				const suffix = displayId.slice(-4);
				const masked = `${prefix}••••${suffix}`;

				return (
					<div className='flex gap-2 items-center'>
						<code className='px-2 py-1 text-sm bg-gray-100 rounded font-mono'>{masked}</code>
					</div>
				);
			},
		},
		{
			title: 'Type',
			render() {
				return (
					<div className='flex gap-2 items-center'>
						<div className='flex items-center gap-1.5 text-purple-600'>
							<Bot size={16} />
							<span className='text-sm font-medium'>Service Account</span>
						</div>
					</div>
				);
			},
		},
		{
			title: 'Roles',
			render(rowData: User) {
				if (!rowData.roles || rowData.roles.length === 0) {
					return <span className='text-gray-500 text-sm'>No Roles</span>;
				}

				return (
					<div className='flex flex-wrap gap-1'>
						{rowData.roles.map((role) => (
							<span key={role} className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800'>
								{role}
							</span>
						))}
					</div>
				);
			},
		},
		{
			title: 'Created At',
			width: 150,
			align: 'right',
			render(rowData) {
				return <span className='text-gray-600'>{formatDateShort(rowData.tenant?.created_at || rowData.tenant?.updated_at || '')}</span>;
			},
		},
	];

	if (isLoadingServiceAccounts) {
		return <Loader />;
	}

	if (isServiceAccountsError) {
		toast.error('Error fetching service accounts');
	}

	return (
		<div>
			<ApiDocsContent tags={['service-accounts']} />
			<ServiceAccountDrawer isOpen={isServiceAccountDrawerOpen} onOpenChange={setIsServiceAccountDrawerOpen} />

			{/* Service Accounts Section */}
			{serviceAccountsResponse?.items.length === 0 && (
				<EmptyPage
					heading='Service Accounts'
					onAddClick={handleAddServiceAccount}
					emptyStateCard={{
						heading: 'Create A Service Account',
						description: 'Create a service account to manage programmatic access with specific roles and permissions.',
						buttonLabel: 'Create Service Account',
						buttonAction: handleAddServiceAccount,
					}}
					tags={['service-accounts']}
				/>
			)}
			{(serviceAccountsResponse?.items.length || 0) > 0 && (
				<Page>
					<SectionHeader title='Service Accounts' titleClassName='text-3xl font-medium'>
						<Button prefixIcon={<Plus />} onClick={handleAddServiceAccount}>
							Add
						</Button>
					</SectionHeader>
					<div className='pb-12 mt-2'>
						<FlexpriceTable showEmptyRow columns={serviceAccountColumns} data={serviceAccountsResponse?.items || []} />
						<ShortPagination unit='Service Accounts' totalItems={serviceAccountsResponse?.pagination?.total || 0} />
					</div>
				</Page>
			)}
		</div>
	);
};

export default ServiceAccountsPage;
