import { ActionButton, Button, CardHeader, Chip, Loader, Page, Spacer, NoDataCard } from '@/components/atoms';
import {
	AddEntitlementDrawer,
	ApiDocsContent,
	ColumnData,
	FlexpriceTable,
	RedirectCell,
	PlanDrawer,
	CreditGrantModal,
	MetadataModal,
} from '@/components/molecules';
import { DetailsCard } from '@/components/molecules';
import { RouteNames } from '@/core/routes/Routes';
import { FEATURE_TYPE } from '@/models/Feature';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { EntitlementApi, PlanApi, CreditGrantApi } from '@/api';
import formatDate from '@/utils/common/format_date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Plus, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/atoms';
import formatChips from '@/utils/common/format_chips';
import { getFeatureTypeChips } from '@/components/molecules/CustomerUsageTable/CustomerUsageTable';
import { formatAmount } from '@/components/atoms/Input/Input';
import { Entitlement } from '@/models/Entitlement';
import { ENTITY_STATUS } from '@/models/base';
import {
	CREDIT_GRANT_PERIOD_UNIT,
	CREDIT_GRANT_EXPIRATION_TYPE,
	CreditGrant,
	CREDIT_SCOPE,
	CREDIT_GRANT_CADENCE,
	CREDIT_GRANT_PERIOD,
} from '@/models/CreditGrant';
import { uniqueId } from 'lodash';
import { formatExpirationPeriod } from '@/pages';
import { ENTITLEMENT_ENTITY_TYPE } from '@/models/Entitlement';
import { EntitlementResponse } from '@/types/dto';
import { PlanPriceTable } from '@/components/organisms';
import { Plan } from '@/models';

const creditGrantColumns: ColumnData<CreditGrant>[] = [
	{
		title: 'Name',
		render: (row) => {
			return <span>{row.name}</span>;
		},
	},
	{
		title: 'Credits',
		render: (row) => {
			return <span>{formatAmount(row.credits.toString())}</span>;
		},
	},
	{
		title: 'Priority',
		render: (row) => {
			return <span>{row.priority ?? '--'}</span>;
		},
	},
	{
		title: 'Expiration Config',
		render: (row) => {
			return <span>{formatExpirationPeriod(row as CreditGrant)}</span>;
		},
	},
];

export const formatInvoiceCadence = (cadence: string): string => {
	switch (cadence.toUpperCase()) {
		case 'ADVANCE':
			return 'Advance';
		case 'ARREAR':
			return 'Arrear';
		default:
			return '';
	}
};

type Params = {
	planId: string;
};
const getFeatureValue = (entitlement: Entitlement) => {
	const value = entitlement.usage_limit?.toFixed() || '';

	switch (entitlement.feature_type) {
		case FEATURE_TYPE.STATIC:
			return entitlement.static_value;
		case FEATURE_TYPE.METERED:
			return (
				<span className='flex items-end gap-1'>
					{formatAmount(value || 'Unlimited')}
					<span className='text-[#64748B] text-sm font-normal font-sans'>
						{value
							? Number(value) > 0
								? entitlement.feature.unit_plural || 'units'
								: entitlement.feature.unit_singular || 'unit'
							: entitlement.feature.unit_plural || 'units'}
					</span>
				</span>
			);
		case FEATURE_TYPE.BOOLEAN:
			return entitlement.is_enabled ? 'Yes' : 'No';
		default:
			return '--';
	}
};

const PlanDetailsPage = () => {
	const navigate = useNavigate();
	const { planId } = useParams<Params>();
	const [drawerOpen, setdrawerOpen] = useState(false);
	const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
	const [creditGrantModalOpen, setCreditGrantModalOpen] = useState(false);
	const [metadataModalOpen, setMetadataModalOpen] = useState(false);
	const [metadata, setMetadata] = useState<Record<string, string>>({});
	const [newCreditGrants, setNewCreditGrants] = useState<CreditGrant[]>([]);
	const queryClient = useQueryClient();

	const {
		data: planData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['fetchPlan', planId],
		queryFn: async () => {
			return await PlanApi.getPlanById(planId!);
		},
		enabled: !!planId,
	});

	const { mutate: archivePlan } = useMutation({
		mutationFn: async () => {
			return await PlanApi.deletePlan(planId!);
		},
		onSuccess: () => {
			toast.success('Plan archived successfully');
			navigate(RouteNames.plan);
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Failed to archive plan');
		},
	});

	const { mutate: updatePlanWithCreditGrant, isPending: isCreatingCreditGrant } = useMutation({
		mutationFn: async (data: CreditGrant) => {
			// Add the new credit grant to local state first
			const newGrant = {
				...data,
				id: uniqueId(),
				plan_id: planId!,
			};

			setNewCreditGrants((prev) => [...prev, newGrant]);
			return await CreditGrantApi.createCreditGrant(newGrant);
		},
		onSuccess: () => {
			toast.success('Credit grant added successfully');
			setCreditGrantModalOpen(false);
			setNewCreditGrants([]);
			queryClient.invalidateQueries({ queryKey: ['fetchPlan', planId] });
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Failed to add credit grant');
			setNewCreditGrants((prev) => prev.slice(0, -1));
		},
	});

	const { mutate: updatePlanMetadata } = useMutation({
		mutationFn: async (data: Record<string, string>) => {
			return await PlanApi.updatePlan(planId!, { metadata: data });
		},
		onSuccess: () => {
			toast.success('Metadata updated successfully');
			setMetadataModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ['fetchPlan', planId] });
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Failed to update metadata');
		},
	});

	const { updateBreadcrumb } = useBreadcrumbsStore();

	useEffect(() => {
		if (planData?.name) {
			updateBreadcrumb(2, planData.name);
		}
	}, [planData, updateBreadcrumb]);

	useEffect(() => {
		if (planData?.metadata) {
			setMetadata(planData.metadata);
		} else {
			setMetadata({});
		}
	}, [planData?.metadata]);

	const columnData: ColumnData<EntitlementResponse>[] = [
		{
			title: 'Feature Name',

			render(row) {
				return <RedirectCell redirectUrl={`${RouteNames.featureDetails}/${row?.feature?.id}`}>{row?.feature?.name}</RedirectCell>;
			},
		},
		{
			title: 'Type',
			render(row) {
				return getFeatureTypeChips({ type: row?.feature_type || '', showIcon: true, showLabel: true });
			},
		},
		{
			title: 'Value',

			render(row) {
				return getFeatureValue(row);
			},
		},
		{
			fieldVariant: 'interactive',
			width: '30px',
			hideOnEmpty: true,
			render(row) {
				return (
					<ActionButton
						deleteMutationFn={async () => {
							return await EntitlementApi.deleteEntitlementById(row?.id);
						}}
						archiveIcon={<Trash2 />}
						archiveText='Delete'
						id={row?.id}
						isEditDisabled={true}
						isArchiveDisabled={row?.status === ENTITY_STATUS.ARCHIVED}
						refetchQueryKey={'fetchPlan'}
						entityName={row?.feature?.name}
					/>
				);
			},
		},
	];

	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		toast.error('Error loading plan data');
		return null;
	}

	if (!planData) {
		toast.error('No plan data available');
		return null;
	}

	const planDetails = [
		{ label: 'Name', value: planData?.name },
		{ label: 'Lookup Key', value: planData?.lookup_key || '--' },
		{ label: 'Description', value: planData?.description || '--' },
		{ label: 'Created Date', value: formatDate(planData?.created_at ?? '') },
		{
			label: 'Status',
			value: <Chip label={formatChips(planData?.status)} variant={planData?.status === 'published' ? 'success' : 'default'} />,
		},
	];

	const getEmptyCreditGrant = (): Partial<CreditGrant> => {
		return {
			id: uniqueId(),
			credits: 0,
			period: CREDIT_GRANT_PERIOD.MONTHLY,
			name: 'Free Credits',
			scope: CREDIT_SCOPE.PLAN,
			cadence: CREDIT_GRANT_CADENCE.ONETIME,
			period_count: 1,
			plan_id: planData?.id || '',
			expiration_type: CREDIT_GRANT_EXPIRATION_TYPE.NEVER,
			expiration_duration_unit: CREDIT_GRANT_PERIOD_UNIT.DAYS,
			priority: 0,
		};
	};

	const getEmptyCreditGrantForModal = (): CreditGrant => {
		const emptyData = getEmptyCreditGrant();
		return {
			id: uniqueId(),
			credits: emptyData.credits || 0,
			period: emptyData.period || CREDIT_GRANT_PERIOD.MONTHLY,
			name: emptyData.name || 'Free Credits',
			scope: emptyData.scope || CREDIT_SCOPE.SUBSCRIPTION,
			cadence: emptyData.cadence || CREDIT_GRANT_CADENCE.ONETIME,
			period_count: emptyData.period_count || 1,
			plan_id: emptyData.plan_id || '',
			expiration_type: emptyData.expiration_type || CREDIT_GRANT_EXPIRATION_TYPE.NEVER,
			expiration_duration_unit: emptyData.expiration_duration_unit || CREDIT_GRANT_PERIOD_UNIT.DAYS,
			priority: 0,
		} as CreditGrant;
	};

	const handleSaveCreditGrant = (data: CreditGrant) => {
		updatePlanWithCreditGrant(data);
	};

	const handleCancelCreditGrant = () => {
		setCreditGrantModalOpen(false);
	};

	// Combine existing and new credit grants for display
	const allCreditGrants = [...(planData?.credit_grants || []), ...newCreditGrants];

	return (
		<Page
			heading={planData?.name}
			headingCTA={
				<>
					<Button onClick={() => setPlanDrawerOpen(true)} variant={'outline'} className='flex gap-2'>
						<Pencil />
						Edit
					</Button>

					<Button onClick={() => archivePlan()} disabled={planData?.status !== 'published'} variant={'outline'} className='flex gap-2'>
						<EyeOff />
						Archive
					</Button>
				</>
			}>
			<CreditGrantModal
				data={getEmptyCreditGrantForModal()}
				isOpen={creditGrantModalOpen}
				onOpenChange={setCreditGrantModalOpen}
				onSave={handleSaveCreditGrant}
				onCancel={handleCancelCreditGrant}
				getEmptyCreditGrant={getEmptyCreditGrant}
			/>
			<MetadataModal open={metadataModalOpen} data={metadata} onSave={updatePlanMetadata} onClose={() => setMetadataModalOpen(false)} />
			<PlanDrawer data={planData as Plan} open={planDrawerOpen} onOpenChange={setPlanDrawerOpen} refetchQueryKeys={['fetchPlan']} />
			<ApiDocsContent tags={['Plans']} />
			<AddEntitlementDrawer
				selectedFeatures={planData.entitlements?.map((v) => v.feature)}
				entitlements={planData.entitlements}
				planId={planData.id}
				entityType={ENTITLEMENT_ENTITY_TYPE.PLAN}
				entityId={planData.id}
				isOpen={drawerOpen}
				onOpenChange={(value) => setdrawerOpen(value)}
			/>

			<div className='space-y-6'>
				<DetailsCard variant='stacked' title='Plan Details' data={planDetails} />

				{/* plan charges table */}
				<PlanPriceTable plan={planData as Plan} onPriceUpdate={() => queryClient.invalidateQueries({ queryKey: ['fetchPlan', planId] })} />

				{planData.entitlements?.length || 0 > 0 ? (
					<Card variant='notched'>
						<CardHeader
							title='Entitlements'
							cta={
								<Button prefixIcon={<Plus />} onClick={() => setdrawerOpen(true)}>
									Add
								</Button>
							}
						/>
						<FlexpriceTable showEmptyRow data={planData.entitlements || []} columns={columnData} />
					</Card>
				) : (
					<NoDataCard
						title='Entitlements'
						subtitle='No entitlements added to the plan yet'
						cta={
							<Button prefixIcon={<Plus />} onClick={() => setdrawerOpen(true)}>
								Add
							</Button>
						}
					/>
				)}

				{allCreditGrants.length > 0 ? (
					<Card variant='notched'>
						<CardHeader
							title='Credit Grants'
							cta={
								<Button prefixIcon={<Plus />} onClick={() => setCreditGrantModalOpen(true)} disabled={isCreatingCreditGrant}>
									{isCreatingCreditGrant ? 'Adding...' : 'Add'}
								</Button>
							}
						/>
						<FlexpriceTable showEmptyRow data={allCreditGrants} columns={creditGrantColumns} />
					</Card>
				) : (
					<NoDataCard
						title='Credit Grants'
						subtitle='No credit grants added to the plan yet'
						cta={
							<Button prefixIcon={<Plus />} onClick={() => setCreditGrantModalOpen(true)} disabled={isCreatingCreditGrant}>
								{isCreatingCreditGrant ? 'Adding...' : 'Add'}
							</Button>
						}
					/>
				)}

				{/* Metadata Section */}
				<Card variant='notched'>
					<CardHeader
						title='Metadata'
						cta={
							<Button variant='outline' size='icon' onClick={() => setMetadataModalOpen(true)}>
								<Pencil className='size-5' />
							</Button>
						}
					/>
					{metadata && Object.keys(metadata).length > 0 ? (
						<DetailsCard
							variant='stacked'
							data={
								metadata && Object.keys(metadata).length > 0
									? Object.entries(metadata).map(([key, value]) => ({ label: key, value }))
									: [{ label: 'No metadata available.', value: '' }]
							}
							cardStyle='borderless'
						/>
					) : (
						<div className='text-center py-8'>
							<h3 className='text-lg font-medium text-gray-900 mb-1'>No metadata</h3>
							<p className='text-sm text-gray-500 mb-4'>Add custom metadata to store additional information about this plan.</p>
						</div>
					)}
				</Card>
				<Spacer className='!h-20' />
			</div>
		</Page>
	);
};

export default PlanDetailsPage;
