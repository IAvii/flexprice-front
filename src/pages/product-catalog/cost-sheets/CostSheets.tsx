import { AddButton, Loader, Page, ShortPagination, Spacer } from '@/components/atoms';
import { CostSheetTable, ApiDocsContent, CostSheetDrawer, QueryBuilder } from '@/components/molecules';
import { EmptyPage } from '@/components/organisms';
import CostSheet from '@/models/CostSheet';
import usePagination from '@/hooks/usePagination';
import GUIDES from '@/constants/guides';
import { useState, useEffect, useMemo } from 'react';
import CostSheetApi from '@/api/CostSheetApi';
import toast from 'react-hot-toast';
import {
	FilterField,
	FilterFieldType,
	DEFAULT_OPERATORS_PER_DATA_TYPE,
	DataType,
	FilterOperator,
	SortOption,
	SortDirection,
} from '@/types/common/QueryBuilder';
import { BaseEntityStatus } from '@/types/common';
import useFilterSorting from '@/hooks/useFilterSorting';
import { useQueryWithEmptyState } from '@/hooks/useQueryWithEmptyState';

const sortingOptions: SortOption[] = [
	{
		field: 'name',
		label: 'Name',
		direction: SortDirection.ASC,
	},
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
	{
		field: 'updated_at',
		label: 'Updated At',
		direction: SortDirection.DESC,
	},
];

const filterOptions: FilterField[] = [
	{
		field: 'name',
		label: 'Name',
		fieldType: FilterFieldType.INPUT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.STRING],
		dataType: DataType.STRING,
	},
	{
		field: 'lookup_key',
		label: 'Lookup Key',
		fieldType: FilterFieldType.INPUT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.STRING],
		dataType: DataType.STRING,
	},
	{
		field: 'created_at',
		label: 'Created At',
		fieldType: FilterFieldType.DATEPICKER,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
		dataType: DataType.DATE,
	},
	{
		field: 'status',
		label: 'Status',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IS_ANY_OF, FilterOperator.IS_NOT_ANY_OF],
		dataType: DataType.ARRAY,
		options: [
			{ value: BaseEntityStatus.PUBLISHED, label: 'Active' },
			{ value: BaseEntityStatus.ARCHIVED, label: 'Inactive' },
		],
	},
];

const CostSheetsPage = () => {
	const { limit, offset, page, reset } = usePagination();
	const [activeCostSheet, setActiveCostSheet] = useState<CostSheet | null>(null);
	const [costSheetDrawerOpen, setCostSheetDrawerOpen] = useState(false);

	const { filters, sorts, setFilters, setSorts, sanitizedFilters, sanitizedSorts } = useFilterSorting({
		initialFilters: [
			{
				field: 'name',
				operator: FilterOperator.CONTAINS,
				valueString: '',
				dataType: DataType.STRING,
				id: 'initial-name',
			},
			{
				field: 'status',
				operator: FilterOperator.IS_ANY_OF,
				valueArray: [BaseEntityStatus.PUBLISHED],
				dataType: DataType.ARRAY,
				id: 'initial-status',
			},
		],
		initialSorts: [
			{
				field: 'updated_at',
				label: 'Updated At',
				direction: SortDirection.DESC,
			},
		],
		debounceTime: 500,
	});

	const fetchCostSheets = async () => {
		return await CostSheetApi.GetCostSheetsByFilter({
			limit: limit,
			offset: offset,
			filters: sanitizedFilters,
			sort: sanitizedSorts,
		});
	};

	useEffect(() => {
		reset();
	}, [sanitizedFilters, sanitizedSorts]);

	const {
		data: costSheetsData,
		isLoading,
		probeData,
		isError,
		error,
	} = useQueryWithEmptyState({
		main: {
			queryKey: ['fetchCostSheets', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: fetchCostSheets,
		},
		probe: {
			queryKey: ['fetchCostSheets', 'probe', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: async () => {
				return await CostSheetApi.GetCostSheetsByFilter({
					limit: 1,
					offset: 0,
					filters: [],
					sort: [],
				});
			},
		},
		shouldProbe: (mainData) => {
			return (mainData?.items?.length ?? 0) === 0;
		},
	});

	const showEmptyPage = useMemo(() => {
		return !isLoading && (probeData?.items?.length ?? 0) === 0 && (costSheetsData?.items?.length ?? 0) === 0;
	}, [isLoading, probeData, costSheetsData]);

	const handleOnAdd = () => {
		setActiveCostSheet(null);
		setCostSheetDrawerOpen(true);
	};

	if (isError) {
		const err = error as any;
		toast.error(err?.error?.message || 'Error fetching cost sheets');
		return null;
	}

	if (showEmptyPage) {
		return (
			<div className='space-y-6'>
				<CostSheetDrawer
					data={activeCostSheet}
					open={costSheetDrawerOpen}
					onOpenChange={setCostSheetDrawerOpen}
					refetchQueryKeys={['fetchCostSheets']}
				/>
				<EmptyPage
					onAddClick={handleOnAdd}
					emptyStateCard={{
						heading: 'Add your first cost sheet',
						description: 'Create your first cost sheet to define pricing structures and charges.',
						buttonLabel: 'Create Cost Sheet',
						buttonAction: handleOnAdd,
					}}
					tutorials={GUIDES.features.tutorials}
					heading='Cost Sheets'
					tags={['Cost Sheets']}
				/>
			</div>
		);
	}

	return (
		<Page heading='Cost Sheets' headingCTA={<AddButton label='Add Cost Sheet' onClick={handleOnAdd} />}>
			<CostSheetDrawer
				data={activeCostSheet}
				open={costSheetDrawerOpen}
				onOpenChange={setCostSheetDrawerOpen}
				refetchQueryKeys={['fetchCostSheets']}
			/>
			<ApiDocsContent tags={['Cost Sheets']} />
			<div className='space-y-6'>
				<QueryBuilder
					filterOptions={filterOptions}
					filters={filters}
					onFilterChange={setFilters}
					sortOptions={sortingOptions}
					onSortChange={setSorts}
					selectedSorts={sorts}
				/>

				{isLoading ? (
					<div className='flex justify-center items-center min-h-[200px]'>
						<Loader />
					</div>
				) : (
					<>
						<CostSheetTable
							data={(costSheetsData?.items || []) as CostSheet[]}
							onEdit={(costSheet: CostSheet) => {
								setActiveCostSheet(costSheet);
								setCostSheetDrawerOpen(true);
							}}
						/>
						<Spacer className='!h-4' />
						<ShortPagination unit='Cost Sheets' totalItems={costSheetsData?.pagination.total ?? 0} />
					</>
				)}
			</div>
		</Page>
	);
};
export default CostSheetsPage;
