import { Button, SelectOption } from '@/components/atoms';
import Preview from '@/components/organisms/Subscription/Preview';
import UsageTable from '@/components/organisms/Subscription/UsageTable';
import { cn } from '@/lib/utils';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { CustomerApi, PlanApi, SubscriptionApi, AddonApi, TaxApi } from '@/api';
import { toSentenceCase } from '@/utils/common/helper_functions';
import { ExpandedPlan } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiDocsContent } from '@/components/molecules';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { RouteNames } from '@/core/routes/Routes';
import { SubscriptionPhase } from '@/models/Subscription';
import { CreateSubscriptionPayload } from '@/types/dto/Subscription';
import { BILLING_CADENCE, INVOICE_CADENCE } from '@/models/Invoice';
import { BILLING_PERIOD } from '@/constants/constants';
import { uniqueId } from 'lodash';
import SubscriptionForm from '@/components/organisms/Subscription/SubscriptionForm';
import { ExtendedPriceOverride, getLineItemOverrides } from '@/utils/common/price_override_helpers';
import { Coupon } from '@/models/Coupon';
import { AddAddonToSubscriptionRequest } from '@/types/dto/Addon';
import { TAXRATE_ENTITY_TYPE } from '@/models/Tax';
import { TaxRateOverride } from '@/types/dto/tax';
import { EXPAND } from '@/models/expand';

type Params = {
	id: string;
	subscription_id?: string;
};

export enum SubscriptionPhaseState {
	EDIT = 'edit',
	SAVED = 'saved',
	NEW = 'new',
}

export type SubscriptionFormState = {
	selectedPlan: string;
	prices: ExpandedPlan | null;
	billingPeriod: BILLING_PERIOD;
	currency: string;
	billingPeriodOptions: SelectOption[];

	// Subscription Phase
	phases: SubscriptionPhase[];
	selectedPhase: number;
	phaseStates: SubscriptionPhaseState[];
	isPhaseEditing: boolean;
	originalPhases: SubscriptionPhase[];

	// Price Overrides
	priceOverrides: Record<string, ExtendedPriceOverride>;

	// Subscription Level Coupon (single coupon)
	linkedCoupon: Coupon | null;

	// Line Item Coupons - maps price_id to single Coupon object
	lineItemCoupons: Record<string, Coupon>;

	// Addons
	addons?: AddAddonToSubscriptionRequest[];
	customerId: string;

	// Tax Rate Overrides
	tax_rate_overrides: TaxRateOverride[];
};

// Data Fetching Hooks
const usePlans = () => {
	return useQuery({
		queryKey: ['plans'],
		queryFn: async () => {
			const plansResponse = await PlanApi.getActiveExpandedPlan({ limit: 1000, offset: 0 });

			try {
				const filteredPlans = plansResponse.filter((plan) => {
					const hasPrices = plan.prices && plan.prices.length > 0;
					return hasPrices;
				});

				return filteredPlans;
			} catch (error) {
				toast.error('Error processing plans data');
				throw error;
			}
		},
	});
};

const useCustomerData = (customerId: string | undefined) => {
	return useQuery({
		queryKey: ['customerSubscription', customerId],
		queryFn: () => CustomerApi.getCustomerById(customerId!),
		enabled: !!customerId,
	});
};

const useSubscriptionData = (subscription_id: string | undefined) => {
	return useQuery({
		queryKey: ['subscription', subscription_id],
		queryFn: async () => {
			const [details, usage] = await Promise.all([
				CustomerApi.getCustomerSubscriptionById(subscription_id!),
				SubscriptionApi.getSubscriptionUsage(subscription_id!),
			]);
			return { details, usage };
		},
		enabled: !!subscription_id,
	});
};

// Hook to fetch addons data
const useAddons = (addonIds: string[] = []) => {
	return useQuery({
		queryKey: ['addons', addonIds],
		queryFn: async () => {
			if (!addonIds.length) return { items: [] };
			const response = await AddonApi.ListAddon({
				addon_ids: addonIds,
				expand: 'prices,entitlements',
			});
			return response;
		},
		enabled: addonIds.length > 0,
	});
};

const CreateCustomerSubscriptionPage: React.FC = () => {
	const { id: customerId, subscription_id } = useParams<Params>();
	const navigate = useNavigate();
	const updateBreadcrumb = useBreadcrumbsStore((state) => state.updateBreadcrumb);

	// Fetch data using React Query
	const { data: customerTaxAssociations } = useQuery({
		queryKey: ['customerTaxAssociations', customerId],
		queryFn: async () => {
			return await TaxApi.listTaxAssociations({
				limit: 100,
				offset: 0,
				entity_id: customerId!,
				expand: EXPAND.TAX_RATE,
				entity_type: TAXRATE_ENTITY_TYPE.CUSTOMER,
			});
		},
		enabled: !!customerId,
	});

	useEffect(() => {
		if (customerTaxAssociations?.items) {
			setSubscriptionState((prev) => ({
				...prev,
				tax_rate_overrides: customerTaxAssociations.items.map((item) => ({
					tax_rate_id: item.tax_rate_id,
					tax_rate_code: item.tax_rate?.code ?? '',
					currency: item.currency.toLowerCase(),
					auto_apply: item.auto_apply,
					priority: item.priority,
					tax_rate_name: item.tax_rate?.name ?? '',
				})),
			}));
		}
	}, [customerTaxAssociations]);

	// Local state
	const [subscriptionState, setSubscriptionState] = useState<SubscriptionFormState>({
		selectedPlan: '',
		prices: null,
		billingPeriod: BILLING_PERIOD.MONTHLY,
		currency: '',
		billingPeriodOptions: [],
		phases: [],
		selectedPhase: 0,
		phaseStates: [],
		isPhaseEditing: false,
		originalPhases: [],
		priceOverrides: {},
		linkedCoupon: null,
		lineItemCoupons: {},
		addons: [],
		customerId: customerId!,
		tax_rate_overrides: [],
	});

	// Fetch data using React Query
	const { data: plans, isLoading: plansLoading, isError: plansError } = usePlans();
	const { data: customerData } = useCustomerData(customerId);
	const { data: subscriptionData } = useSubscriptionData(subscription_id);

	// Get addon IDs from subscription state
	const addonIds = useMemo(() => subscriptionState.addons?.map((addon) => addon.addon_id) || [], [subscriptionState.addons]);
	const { data: addons } = useAddons(addonIds);

	// Helper function to count addon ID occurrences
	const getAddonCounts = useMemo(() => {
		const counts = new Map<string, number>();
		subscriptionState.addons?.forEach((addon) => {
			counts.set(addon.addon_id, (counts.get(addon.addon_id) || 0) + 1);
		});
		return counts;
	}, [subscriptionState.addons]);

	// Memoized function to get combined prices from subscription and addons
	const getPrices = useMemo(() => {
		const subscriptionPrices =
			subscriptionState.prices?.prices?.filter(
				(price) =>
					price.billing_period.toLowerCase() === subscriptionState.billingPeriod.toLowerCase() &&
					price.currency.toLowerCase() === subscriptionState.currency.toLowerCase(),
			) || [];

		// Get matching addon prices and create unique instances for each count
		const addonPrices =
			addons?.items?.flatMap((addon) => {
				const count = getAddonCounts.get(addon.id) || 0;
				const matchingPrices =
					addon.prices?.filter(
						(price) =>
							price.billing_period.toLowerCase() === subscriptionState.billingPeriod.toLowerCase() &&
							price.currency.toLowerCase() === subscriptionState.currency.toLowerCase(),
					) || [];

				// Create unique instances for each count with unique IDs
				return Array.from({ length: count }, (_, index) =>
					matchingPrices.map((price) => ({
						...price,
						// Append instance index to make price ID unique for each instance
						id: `${price.id}_instance_${index}`,
					})),
				).flat();
			}) || [];

		return [...subscriptionPrices, ...addonPrices];
	}, [subscriptionState.prices, subscriptionState.billingPeriod, subscriptionState.currency, addons, getAddonCounts]);

	// Coupons are handled in SubscriptionForm

	// Update breadcrumb when customer data changes
	useEffect(() => {
		if (customerData?.external_id) {
			updateBreadcrumb(2, customerData.external_id);
		}
	}, [customerData, updateBreadcrumb]);

	// Initialize subscription state when subscription data is available
	useEffect(() => {
		if (subscriptionData?.details && plans) {
			const planDetails = plans.find((plan) => plan.id === subscriptionData.details.plan_id);
			if (planDetails) {
				// Create initial phase
				const initialPhase: Partial<SubscriptionPhase> = {
					billing_cycle: subscriptionData.details.billing_cycle,
					start_date: new Date(subscriptionData.details.start_date),
					end_date: subscriptionData.details.end_date ? new Date(subscriptionData.details.end_date) : null,
					line_items: [],
					credit_grants: [],
					prorate_charges: false,
				};

				// Get available billing periods and currencies
				const billingPeriods = [...new Set(planDetails.prices?.map((price) => price.billing_period) || [])];

				setSubscriptionState({
					selectedPlan: subscriptionData.details.plan_id,
					prices: planDetails,
					billingPeriod: subscriptionData.details.billing_period.toLowerCase() as BILLING_PERIOD,
					currency: subscriptionData.details.currency,
					billingPeriodOptions: billingPeriods.map((period) => ({
						label: toSentenceCase(period.replace('_', ' ')),
						value: period,
					})),
					phases: [initialPhase as SubscriptionPhase],
					selectedPhase: 0,
					phaseStates: [SubscriptionPhaseState.SAVED],
					isPhaseEditing: false,
					originalPhases: [initialPhase as SubscriptionPhase],
					priceOverrides: {},
					linkedCoupon: null,
					lineItemCoupons: {},
					addons: [],
					customerId: customerId!,
					tax_rate_overrides: [],
				});
			}
		}
	}, [subscriptionData, plans, customerId]);

	// Create subscription mutation
	const { mutate: createSubscription, isPending: isCreating } = useMutation({
		mutationKey: ['createSubscription'],
		mutationFn: async (data: CreateSubscriptionPayload) => {
			return await SubscriptionApi.createSubscription(data);
		},
		onSuccess: async () => {
			toast.success('Subscription created successfully');

			refetchQueries(['debug-customers']);
			refetchQueries(['debug-subscriptions']);

			navigate(`${RouteNames.customers}/${customerId}`);
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Error creating subscription');
		},
	});

	const handleSubscriptionSubmit = () => {
		const {
			billingPeriod,
			selectedPlan,
			currency,
			phases,
			priceOverrides,
			prices,
			linkedCoupon,
			lineItemCoupons,
			tax_rate_overrides,
			addons,
		} = subscriptionState;

		if (!billingPeriod || !selectedPlan) {
			toast.error('Please select a plan and billing period.');
			return;
		}

		if (phases.length === 0) {
			toast.error('Please add at least one phase.');
			return;
		}

		phases.forEach((phase, index) => {
			if (!phase.billing_cycle) {
				toast.error(`Please select a billing cycle for ${index + 1}	phase`);
				return;
			}

			if (!phase.start_date) {
				toast.error(`Please select a start date for ${index + 1}	phase`);
				return;
			}
		});

		// Check for any unsaved changes
		if (subscriptionState.isPhaseEditing && subscriptionState.phases.length > 1) {
			toast.error('Please save your changes before submitting.');
			return;
		}

		// Get price overrides for backend
		const currentPrices =
			prices?.prices?.filter(
				(price) =>
					price.billing_period.toLowerCase() === billingPeriod.toLowerCase() && price.currency.toLowerCase() === currency.toLowerCase(),
			) || [];
		const overrideLineItems = getLineItemOverrides(currentPrices, priceOverrides);

		// TODO: Remove this once the feature is released
		const tempSubscriptionId = uniqueId('tempsubscription_');
		const sanitizedPhases = phases.map((phase) => {
			const phaseCreditGrants = phase.credit_grants?.map((grant) => ({
				...grant,
				id: undefined as any,
				currency: currency.toLowerCase(),
				subscription_id: tempSubscriptionId,
				period: grant.period,
			}));
			return {
				...phase,
				start_date: phase.start_date,
				end_date: phase.end_date,
				commitment_amount: phase.commitment_amount,
				overage_factor: phase.overage_factor ?? 1,
				credit_grants: Array.isArray(phaseCreditGrants) && phaseCreditGrants.length > 0 ? phaseCreditGrants : undefined,
			};
		});
		const firstPhase = sanitizedPhases[0];

		const payload: CreateSubscriptionPayload = {
			billing_cadence: BILLING_CADENCE.RECURRING,
			billing_period: billingPeriod.toUpperCase() as BILLING_PERIOD,
			billing_period_count: 1,

			// TODO: remove lower case currency after the feature is released
			currency: currency.toLowerCase(),
			customer_id: customerId!,
			invoice_cadence: INVOICE_CADENCE.ARREAR,
			plan_id: selectedPlan,
			start_date: (firstPhase.start_date as Date).toISOString(),
			end_date: firstPhase.end_date ? (firstPhase.end_date as Date).toISOString() : null,
			lookup_key: '',
			trial_end: null,
			trial_start: null,
			billing_cycle: firstPhase.billing_cycle,
			phases: sanitizedPhases.length > 1 ? sanitizedPhases : undefined,
			credit_grants: (firstPhase.credit_grants?.length ?? 0 > 0) ? firstPhase.credit_grants : undefined,
			commitment_amount: firstPhase.commitment_amount,
			override_line_items: overrideLineItems.length > 0 ? overrideLineItems : undefined,
			addons: (addons?.length ?? 0) > 0 ? addons : undefined,
			coupons: linkedCoupon ? [linkedCoupon.id] : undefined,
			line_item_coupons:
				Object.keys(lineItemCoupons).length > 0
					? Object.fromEntries(
							Object.entries(lineItemCoupons).map(([priceId, coupon]) => [
								priceId,
								[coupon.id], // Convert single coupon to array format for API
							]),
						)
					: undefined,

			// TODO: remove this once the feature is released
			overage_factor: firstPhase.overage_factor ?? 1,

			// Tax rate overrides
			tax_rate_overrides: tax_rate_overrides.length > 0 ? tax_rate_overrides : undefined,
		};

		createSubscription(payload);
	};

	const navigateBack = () => navigate(`${RouteNames.customers}/${customerId}`);

	const showPreview = subscriptionState.selectedPlan && !subscriptionData?.usage;

	return (
		<div className={cn('flex gap-8 mt-5 relative mb-12')}>
			<ApiDocsContent tags={['Subscriptions']} />
			<div className='flex-[6] space-y-6 mb-12 overflow-y-auto pr-4'>
				{subscriptionData?.usage?.charges && subscriptionData.usage.charges.length > 0 && (
					<div>
						<UsageTable data={subscriptionData.usage} />
					</div>
				)}

				<SubscriptionForm
					state={subscriptionState}
					setState={setSubscriptionState}
					plans={plans}
					plansLoading={plansLoading}
					plansError={plansError}
					isDisabled={!!subscription_id}
				/>

				{/* Coupon UI moved to SubscriptionForm */}

				{subscriptionState.selectedPlan && !subscription_id && (
					<div className='flex items-center justify-start space-x-4'>
						<Button onClick={navigateBack} variant={'outline'}>
							Cancel
						</Button>
						<Button onClick={handleSubscriptionSubmit} isLoading={isCreating}>
							Add Subscription
						</Button>
					</div>
				)}
			</div>

			<div className='flex-[4]'>
				<div className='sticky top-6'>
					{showPreview && (
						<Preview
							data={getPrices}
							selectedPlan={subscriptionState.prices}
							phases={subscriptionState.phases}
							coupons={subscriptionState.linkedCoupon ? [subscriptionState.linkedCoupon] : []}
							priceOverrides={subscriptionState.priceOverrides}
							lineItemCoupons={subscriptionState.lineItemCoupons}
							taxRateOverrides={subscriptionState.tax_rate_overrides}
							addons={subscriptionState.addons || []}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default CreateCustomerSubscriptionPage;
