import { AddButton, Loader, Page, ShortPagination, Spacer } from '@/components/atoms';
import { ApiDocsContent, FeatureTable } from '@/components/molecules';
import EmptyPage from '@/components/organisms/EmptyPage/EmptyPage';
import { RouteNames } from '@/core/routes/Routes';
import GUIDES from '@/constants/guides';
import usePagination from '@/hooks/usePagination';
import FeatureApi from '@/api/FeatureApi';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router';
import { useEffect, useMemo } from 'react';
import {
	FilterField,
	FilterFieldType,
	DEFAULT_OPERATORS_PER_DATA_TYPE,
	DataType,
	FilterOperator,
	SortOption,
	SortDirection,
} from '@/types/common/QueryBuilder';
import { QueryBuilder } from '@/components/molecules';
import { ENTITY_STATUS } from '@/models';
import { FEATURE_TYPE } from '@/models/Feature';
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
			{ value: ENTITY_STATUS.PUBLISHED, label: 'Active' },
			{ value: ENTITY_STATUS.ARCHIVED, label: 'Inactive' },
		],
	},
	{
		field: 'type',
		label: 'Type',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.ARRAY],
		dataType: DataType.ARRAY,
		options: [
			{ value: FEATURE_TYPE.METERED, label: 'Metered' },
			{ value: FEATURE_TYPE.BOOLEAN, label: 'Boolean' },
			{ value: FEATURE_TYPE.STATIC, label: 'Static' },
		],
	},
];

const FeaturesPage = () => {
	const { limit, offset, page, reset } = usePagination();

	// Add debounce to search query

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
				valueArray: [ENTITY_STATUS.PUBLISHED],
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

	const fetchFeatures = async () => {
		return await FeatureApi.getFeaturesByFilter({
			limit: limit,
			offset: offset,
			filters: sanitizedFilters,
			sort: sanitizedSorts,
		});
	};
	const navigate = useNavigate();

	useEffect(() => {
		reset();
	}, [sanitizedFilters, sanitizedSorts]);

	const {
		isLoading,
		isError,
		data: featureData,
		probeData,
	} = useQueryWithEmptyState({
		main: {
			queryKey: ['fetchFeatures', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: fetchFeatures,
		},
		probe: {
			queryKey: ['fetchFeatures', 'probe', page, JSON.stringify(sanitizedFilters), JSON.stringify(sanitizedSorts)],
			queryFn: async () => {
				return await FeatureApi.getFeaturesByFilter({
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

	// show empty page when no features and no search query
	const showEmptyPage = useMemo(() => {
		return !isLoading && probeData?.items.length === 0 && featureData?.items.length === 0;
	}, [isLoading, probeData, featureData]);

	if (isLoading) {
		return <Loader />;
	}

	// Handle error state
	if (isError) {
		toast.error('Error fetching features');
		return null;
	}

	// Render empty state when no features and no search query
	if (showEmptyPage) {
		return (
			<EmptyPage
				heading='Features'
				tags={['Features']}
				tutorials={GUIDES.features.tutorials}
				emptyStateCard={{
					heading: 'Add Your First Feature',
					description: 'Create your first feature to define what customers pay for.',
					buttonLabel: 'Create Feature',
					buttonAction: () => navigate(RouteNames.createFeature),
				}}
				onAddClick={() => navigate(RouteNames.createFeature)}
			/>
		);
	}

	return (
		<Page
			heading='Features'
			headingCTA={
				<div className='flex justify-between items-center gap-2'>
					<Link to={RouteNames.createFeature}>
						<AddButton />
					</Link>
				</div>
			}>
			<ApiDocsContent tags={['Features']} />
			<div>
				<QueryBuilder
					filterOptions={filterOptions}
					filters={filters}
					onFilterChange={setFilters}
					sortOptions={sortingOptions}
					onSortChange={setSorts}
					selectedSorts={sorts}
				/>
				<FeatureTable data={featureData?.items || []} />
				<Spacer className='!h-4' />
				<ShortPagination unit='Features' totalItems={featureData?.pagination.total ?? 0} />
			</div>
		</Page>
	);
};
export default FeaturesPage;
