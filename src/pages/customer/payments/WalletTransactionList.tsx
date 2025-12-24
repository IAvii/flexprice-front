import WalletApi from '@/api/WalletApi';
import useAllUsers from '@/hooks/useAllUsers';
import usePagination, { PAGINATION_PREFIX } from '@/hooks/usePagination';
import { Loader, ShortPagination, Spacer } from '@/components/atoms';
import { AllWalletTransactionsTable, QueryBuilder } from '@/components/molecules';
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
import { User } from '@/models/User';
import { EXPAND } from '@/models/expand';
import { generateExpandQueryParams } from '@/utils/common/api_helper';
import toast from 'react-hot-toast';

const sortingOptions: SortOption[] = [
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
];

const WalletTransactionList = () => {
	const { limit, offset, page, reset } = usePagination({
		prefix: PAGINATION_PREFIX.WALLET_TRANSACTIONS,
	});

	// Fetch users for the Created By filter
	const { users, isLoading: isUsersLoading, isError: isUsersError } = useAllUsers();

	const userOptions = useMemo(() => {
		return (
			users?.items.map((user: User) => ({
				value: user.id,
				label: user.email || user.name || user.id,
			})) || []
		);
	}, [users]);

	const filterOptions: FilterField[] = useMemo(() => {
		// Only show Created By filter if users were successfully fetched
		if (isUsersError || !users?.items || users.items.length === 0) {
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
		debounceTime: 300,
	});

	const fetchWalletTransactions = async () => {
		return await WalletApi.getAllWalletTransactionsByFilter({
			limit,
			offset,
			filters: sanitizedFilters,
			sort: sanitizedSorts,
			expand: generateExpandQueryParams([EXPAND.CUSTOMER, EXPAND.CREATED_BY_USER]),
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
			queryKey: ['fetchAllWalletTransactionsMain', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: fetchWalletTransactions,
		},
		probe: {
			queryKey: ['fetchAllWalletTransactionsProbe', 'probe', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
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

	if (isError) {
		toast.error('Error fetching wallet transactions');
	}

	if (isLoading || isUsersLoading) {
		return <Loader />;
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
			<AllWalletTransactionsTable data={transactionsData?.items || []} />
			<Spacer className='!h-4' />
			<ShortPagination
				unit='Transactions'
				totalItems={transactionsData?.pagination.total ?? 0}
				prefix={PAGINATION_PREFIX.WALLET_TRANSACTIONS}
			/>
		</div>
	);
};

export default WalletTransactionList;
