import { useQuery } from '@tanstack/react-query';
import WalletApi from '@/api/WalletApi';
import { UserApi } from '@/api';
import usePagination from '@/hooks/usePagination';
import { Loader, ShortPagination, Spacer } from '@/components/atoms';
import { WalletTransactionsTable, QueryBuilder } from '@/components/molecules';
import { useEffect, useMemo } from 'react';
import {
	FilterField,
	FilterFieldType,
	DataType,
	FilterOperator,
	SortOption,
	SortDirection,
	DEFAULT_OPERATORS_PER_DATA_TYPE,
} from '@/types/common/QueryBuilder';
import useFilterSorting from '@/hooks/useFilterSorting';
import { useQueryWithEmptyState } from '@/hooks/useQueryWithEmptyState';

const sortingOptions: SortOption[] = [
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
];

const WalletTransactionList = () => {
	const { limit, offset, page, reset } = usePagination();

	// Fetch users for the Created By filter
	const {
		data: users,
		isLoading: isUsersLoading,
		isError: isUsersError,
	} = useQuery({
		queryKey: ['getAllUsers'],
		queryFn: () => UserApi.getAllUsers(),
		retry: false,
	});

	const userOptions = useMemo(() => {
		return (
			users?.map((user) => ({
				value: user.id,
				label: user.email || user.name || user.id,
			})) || []
		);
	}, [users]);

	const filterOptions: FilterField[] = useMemo(() => {
		// Only show Created By filter if users were successfully fetched
		if (isUsersError || !users || users.length === 0) {
			return [
				{
					field: 'created_at',
					label: 'Created At',
					fieldType: FilterFieldType.DATEPICKER,
					operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
					dataType: DataType.DATE,
				},
			];
		}
		return [
			{
				field: 'created_by',
				label: 'Created By',
				fieldType: FilterFieldType.MULTI_SELECT,
				operators: [FilterOperator.IS_ANY_OF, FilterOperator.IS_NOT_ANY_OF],
				dataType: DataType.ARRAY,
				options: userOptions,
			},
			{
				field: 'created_at',
				label: 'Created At',
				fieldType: FilterFieldType.DATEPICKER,
				operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
				dataType: DataType.DATE,
			},
		];
	}, [userOptions, isUsersError, users]);

	const { filters, sorts, setFilters, setSorts, sanitizedFilters, sanitizedSorts } = useFilterSorting({
		initialFilters: [],
		initialSorts: [
			{
				field: 'created_at',
				label: 'Created At',
				direction: SortDirection.DESC,
			},
		],
		debounceTime: 500,
	});

	const fetchWalletTransactions = async () => {
		return await WalletApi.getAllWalletTransactionsByFilter({
			limit,
			offset,
			filters: sanitizedFilters,
			sort: sanitizedSorts,
			expand: 'customer,created_by_user',
		});
	};

	useEffect(() => {
		reset();
	}, [sanitizedFilters, sanitizedSorts]);

	const {
		isLoading,
		isError,
		data: transactionsData,
		probeData,
	} = useQueryWithEmptyState({
		main: {
			queryKey: ['fetchAllWalletTransactions', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: fetchWalletTransactions,
		},
		probe: {
			queryKey: ['fetchAllWalletTransactions', 'probe', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: async () => {
				return await WalletApi.getAllWalletTransactionsByFilter({
					limit: 1,
					offset: 0,
					filters: [],
					sort: [],
				});
			},
		},
		shouldProbe: (mainData) => {
			return mainData?.items.length === 0;
		},
	});

	const showEmptyPage = useMemo(() => {
		return !isLoading && probeData?.items.length === 0 && transactionsData?.items.length === 0;
	}, [isLoading, probeData, transactionsData]);

	if (isLoading || isUsersLoading) {
		return <Loader />;
	}

	if (isError) {
		return (
			<div className='card'>
				<div className='text-center py-12'>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>Backend API Limitation</h3>
					<p className='text-sm text-gray-500 mb-4'>
						The backend only supports wallet transaction search per wallet:
						<br />
						<code className='text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block'>
							POST /v1/wallets/&#123;wallet_id&#125;/transactions/search
						</code>
					</p>
					<p className='text-sm text-gray-500'>
						To show all wallet transactions across all wallets, the backend needs to implement:
						<br />
						<code className='text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block'>POST /v1/wallets/transactions/search</code>
						<br />
						<span className='text-xs text-gray-400 mt-2 inline-block'>(without requiring a specific wallet_id)</span>
					</p>
				</div>
			</div>
		);
	}

	if (showEmptyPage) {
		return (
			<div className='card'>
				<div className='text-center py-12'>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>No Wallet Transactions</h3>
					<p className='text-sm text-gray-500'>There are no wallet transactions to display.</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<QueryBuilder
				filterOptions={filterOptions}
				filters={filters}
				onFilterChange={setFilters}
				sortOptions={sortingOptions}
				onSortChange={setSorts}
				selectedSorts={sorts}
			/>
			<Spacer className='!h-4' />
			<WalletTransactionsTable data={transactionsData?.items || []} users={users || []} />
			<Spacer className='!h-4' />
			<ShortPagination unit='Transactions' totalItems={transactionsData?.pagination.total ?? 0} />
		</div>
	);
};

export default WalletTransactionList;
