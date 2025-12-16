import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Button, SelectOption } from '@/components/atoms';
import { ApiDocsContent } from '@/components/molecules';
import { UsageTable, SubscriptionForm } from '@/components/organisms';
import { Building, User } from 'lucide-react';

import { AddonApi, CustomerApi, PlanApi, SubscriptionApi, TaxApi, CouponApi } from '@/api';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { RouteNames } from '@/core/routes/Routes';
import { ServerError } from '@/core/axios/types';

import {
	BILLING_CADENCE,
	SubscriptionPhase,
	Coupon,
	TAXRATE_ENTITY_TYPE,
	EXPAND,
	BILLING_CYCLE,
	INVOICE_BILLING,
	SUBSCRIPTION_STATUS,
} from '@/models';
import { InternalCreditGrantRequest, creditGrantToInternal, internalToCreateRequest } from '@/types/dto/CreditGrant';
import { BILLING_PERIOD } from '@/constants/constants';

import {
	ExpandedPlan,
	CreateSubscriptionRequest,
	AddAddonToSubscriptionRequest,
	TaxRateOverride,
	EntitlementOverrideRequest,
} from '@/types/dto';
import { OverrideLineItemRequest, SubscriptionPhaseCreateRequest } from '@/types/dto/Subscription';

import { cn } from '@/lib/utils';
import { toSentenceCase } from '@/utils/common/helper_functions';
import { ExtendedPriceOverride, getLineItemOverrides } from '@/utils/common/price_override_helpers';
import { extractLineItemCommitments } from '@/utils/common/commitment_helpers';
import { extractSubscriptionBoundaries, extractFirstPhaseData } from '@/utils/subscription/phaseConversion';

import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';

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
	billingCycle: BILLING_CYCLE;
	commitmentAmount: string;
	overageFactor: string;
	startDate: string;
	endDate?: string;
	phases: SubscriptionPhaseCreateRequest[];
	selectedPhase: number;
	phaseStates: SubscriptionPhaseState[];
	isPhaseEditing: boolean;
	originalPhases: SubscriptionPhase[];
	priceOverrides: Record<string, ExtendedPriceOverride>;
	linkedCoupon: Coupon | null;
	lineItemCoupons: Record<string, Coupon>;
	addons?: AddAddonToSubscriptionRequest[];
	customerId: string;
	tax_rate_overrides: TaxRateOverride[];
	entitlementOverrides: Record<string, EntitlementOverrideRequest>;
	creditGrants: InternalCreditGrantRequest[];
	enable_true_up: boolean;
	invoiceBillingConfig?: INVOICE_BILLING;
};

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

const useAddons = (addonIds: string[]) => {
	return useQuery({
		queryKey: ['addons', addonIds],
		queryFn: async () => {
			if (addonIds.length === 0) return { items: [] };
			const response = await AddonApi.List({ limit: 1000, offset: 0 });
			const filteredItems = response.items.filter((addon) => addonIds.includes(addon.id));
			return { ...response, items: filteredItems };
		},
		enabled: addonIds.length > 0,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
};

const CreateCustomerSubscriptionPage: React.FC = () => {
	const { id: customerId, subscription_id } = useParams<Params>();
	const navigate = useNavigate();
	const updateBreadcrumb = useBreadcrumbsStore((state) => state.updateBreadcrumb);

	const [isDraft, setIsDraft] = useState(false);
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

	const [subscriptionState, setSubscriptionState] = useState<SubscriptionFormState>({
		selectedPlan: '',
		prices: null,
		billingPeriod: BILLING_PERIOD.MONTHLY,
		currency: '',
		billingPeriodOptions: [],
		billingCycle: BILLING_CYCLE.ANNIVERSARY,
		commitmentAmount: '',
		overageFactor: '',
		startDate: new Date().toISOString(),
		endDate: undefined,
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
		entitlementOverrides: {},
		creditGrants: [],
		enable_true_up: false,
		invoiceBillingConfig: undefined,
	});

	const { data: plans, isLoading: plansLoading, isError: plansError } = usePlans();
	const { data: customerData } = useCustomerData(customerId);
	const { data: subscriptionData } = useSubscriptionData(subscription_id);

	const { data: couponsResponse } = useQuery({
		queryKey: ['coupons'],
		queryFn: () => CouponApi.getAllCoupons({ limit: 1000, offset: 0 }),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});
	const allCouponsData = couponsResponse?.items || [];

	const addonIds = useMemo(() => subscriptionState.addons?.map((addon) => addon.addon_id) || [], [subscriptionState.addons]);
	useAddons(addonIds);

	const isPriceActive = (price: { start_date?: string }) => {
		if (!price.start_date) return true;
		const now = new Date();
		const startDate = new Date(price.start_date);
		if (isNaN(startDate.getTime())) return true;
		return startDate <= now;
	};

	useEffect(() => {
		if (customerData?.external_id) {
			updateBreadcrumb(2, customerData.external_id);
		}
		// Initialize invoice billing config to parent if customer has parent
		if (customerData?.parent_customer_id) {
			setSubscriptionState((prev) => ({
				...prev,
				invoiceBillingConfig: INVOICE_BILLING.INVOICED_TO_PARENT,
			}));
		}
	}, [customerData, updateBreadcrumb]);

	useEffect(() => {
		if (subscriptionData?.details && plans) {
			const planDetails = plans.find((plan) => plan.id === subscriptionData.details.plan_id);
			if (planDetails) {
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
					billingCycle: subscriptionData.details.billing_cycle || BILLING_CYCLE.ANNIVERSARY,
					startDate: subscriptionData.details.start_date,
					endDate: subscriptionData.details.end_date || undefined,
					commitmentAmount: subscriptionData.details.commitment_amount?.toString() ?? '',
					overageFactor: subscriptionData.details.overage_factor?.toString() ?? '',
					phases: [],
					selectedPhase: -1,
					phaseStates: [],
					isPhaseEditing: false,
					originalPhases: [],
					priceOverrides: {},
					linkedCoupon: null,
					lineItemCoupons: {},
					addons: [],
					customerId: customerId!,
					tax_rate_overrides: [],
					entitlementOverrides: {},
					creditGrants: (subscriptionData.details.credit_grants || []).map(creditGrantToInternal),
					enable_true_up: (subscriptionData.details as any).enable_true_up ?? false,
				});
			}
		}
	}, [subscriptionData, plans, customerId]);

	const { mutate: createSubscription, isPending: isCreating } = useMutation({
		mutationKey: ['createSubscription'],
		mutationFn: async (data: CreateSubscriptionRequest) => {
			return await SubscriptionApi.createSubscription(data);
		},
		onSuccess: async (_, variables) => {
			const isDraft = variables.subscription_status === SUBSCRIPTION_STATUS.DRAFT;
			toast.success(isDraft ? 'Draft subscription saved successfully' : 'Subscription created successfully');

			refetchQueries(['debug-customers']);
			refetchQueries(['debug-subscriptions']);

			navigate(`${RouteNames.customers}/${customerId}`);
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Error creating subscription');
		},
	});

	/**
	 * Validates subscription form data before submission
	 */
	const validateSubscriptionData = (): string | null => {
		const { billingPeriod, selectedPlan, startDate, phases } = subscriptionState;

		if (!billingPeriod || !selectedPlan) {
			return 'Please select a plan and billing period.';
		}

		if (!startDate) {
			return 'Please select a start date for the subscription.';
		}

		for (let i = 0; i < phases.length; i++) {
			if (!phases[i].start_date) {
				return `Please select a start date for phase ${i + 1}`;
			}
		}

		if (subscriptionState.isPhaseEditing) {
			return 'Please save your changes before submitting.';
		}

		return null;
	};

	/**
	 * Sanitizes and prepares subscription data for API submission.
	 *
	 * IMPORTANT: During sanitization, quantity is automatically excluded from line item
	 * overrides for USAGE type prices. This is because usage-based prices calculate quantity
	 * dynamically from meter usage, and including a static quantity override would conflict
	 * with the usage-based billing model. The getLineItemOverrides helper function handles
	 * this exclusion automatically.
	 */
	const sanitizeSubscriptionData = () => {
		const {
			billingPeriod,
			selectedPlan,
			currency,
			billingCycle,
			startDate,
			endDate,
			phases,
			priceOverrides,
			prices,
			linkedCoupon,
			lineItemCoupons,
			tax_rate_overrides,
			overageFactor,
			commitmentAmount,
			entitlementOverrides,
			creditGrants,
			invoiceBillingConfig,
		} = subscriptionState;

		let finalStartDate: string;
		let finalEndDate: string | undefined;
		let finalCoupons: string[] | undefined;
		let finalLineItemCoupons: Record<string, string[]> | undefined;
		let finalOverrideLineItems: OverrideLineItemRequest[] | undefined;
		let finalLineItemCommitments: Record<string, any> | undefined;
		let sanitizedPhases: SubscriptionPhaseCreateRequest[] | undefined;

		if (phases.length > 0) {
			// Multi-phase subscription: extract data from phases
			const boundaries = extractSubscriptionBoundaries(phases);
			finalStartDate = boundaries.startDate;
			finalEndDate = boundaries.endDate;

			const firstPhaseData = extractFirstPhaseData(phases);
			finalCoupons = firstPhaseData.coupons;
			finalLineItemCoupons = firstPhaseData.line_item_coupons;
			finalOverrideLineItems = firstPhaseData.override_line_items;

			// Extract commitments from first phase if present
			// Note: Phase-level commitments should be extracted from phase.line_item_commitments if phases support them
			finalLineItemCommitments = undefined; // Phases handle their own commitments

			// Sanitize phases (quantity exclusion for USAGE prices handled in PhaseList conversion)
			sanitizedPhases = phases.map((phase) => ({
				start_date: phase.start_date,
				end_date: phase.end_date || undefined,
				coupons: phase.coupons || undefined,
				line_item_coupons: phase.line_item_coupons || undefined,
				override_line_items: phase.override_line_items || undefined,
				line_item_commitments: phase.line_item_commitments || undefined,
				metadata: phase.metadata || undefined,
			}));
		} else {
			// Single-phase subscription: use subscription-level data
			finalStartDate = new Date(startDate).toISOString();
			finalEndDate = endDate ? new Date(endDate).toISOString() : undefined;

			// Get current prices for the selected billing period and currency
			const currentPrices =
				prices?.prices?.filter(
					(price) =>
						price.billing_period.toLowerCase() === billingPeriod.toLowerCase() &&
						price.currency.toLowerCase() === currency.toLowerCase() &&
						isPriceActive(price),
				) || [];

			// Convert price overrides to line item overrides
			// Note: getLineItemOverrides automatically excludes quantity for USAGE type prices
			finalOverrideLineItems = getLineItemOverrides(currentPrices, priceOverrides);

			// Extract line item commitments from price overrides
			const commitments = extractLineItemCommitments(priceOverrides);
			finalLineItemCommitments = Object.keys(commitments).length > 0 ? commitments : undefined;

			finalCoupons = linkedCoupon ? [linkedCoupon.id] : undefined;
			finalLineItemCoupons =
				Object.keys(lineItemCoupons).length > 0
					? Object.fromEntries(Object.entries(lineItemCoupons).map(([priceId, coupon]) => [priceId, [coupon.id]]))
					: undefined;

			sanitizedPhases = undefined;
		}

		return {
			billingPeriod,
			selectedPlan,
			currency,
			billingCycle,
			finalStartDate,
			finalEndDate,
			finalCoupons,
			finalLineItemCoupons,
			finalOverrideLineItems,
			finalLineItemCommitments,
			sanitizedPhases,
			tax_rate_overrides,
			overageFactor,
			commitmentAmount,
			entitlementOverrides,
			creditGrants,
			invoiceBillingConfig,
		};
	};

	const handleSubscriptionSubmit = (isDraftParam: boolean = false) => {
		// Validate form data
		const validationError = validateSubscriptionData();
		if (validationError) {
			toast.error(validationError);
			return;
		}

		// Sanitize subscription data
		const sanitized = sanitizeSubscriptionData();

		// Build API payload
		const payload: CreateSubscriptionRequest = {
			billing_cadence: BILLING_CADENCE.RECURRING,
			billing_period: sanitized.billingPeriod.toUpperCase() as BILLING_PERIOD,
			billing_period_count: 1,
			billing_cycle: sanitized.billingCycle,
			currency: sanitized.currency.toLowerCase(),
			customer_id: customerId!,
			plan_id: sanitized.selectedPlan,
			start_date: sanitized.finalStartDate,
			end_date: sanitized.finalEndDate,
			commitment_amount:
				sanitized.commitmentAmount && sanitized.commitmentAmount.trim() !== '' ? parseFloat(sanitized.commitmentAmount) : undefined,
			overage_factor: sanitized.overageFactor && sanitized.overageFactor.trim() !== '' ? parseFloat(sanitized.overageFactor) : undefined,
			lookup_key: '',
			phases: sanitized.sanitizedPhases,
			override_line_items:
				sanitized.finalOverrideLineItems && sanitized.finalOverrideLineItems.length > 0 ? sanitized.finalOverrideLineItems : undefined,
			line_item_commitments: sanitized.finalLineItemCommitments,
			addons: subscriptionState.addons && subscriptionState.addons.length > 0 ? subscriptionState.addons : undefined,
			coupons: sanitized.finalCoupons,
			line_item_coupons: sanitized.finalLineItemCoupons,
			tax_rate_overrides: sanitized.tax_rate_overrides.length > 0 ? sanitized.tax_rate_overrides : undefined,
			override_entitlements:
				Object.keys(sanitized.entitlementOverrides).length > 0 ? Object.values(sanitized.entitlementOverrides) : undefined,
			credit_grants: sanitized.creditGrants.length > 0 ? sanitized.creditGrants.map(internalToCreateRequest) : undefined,
			enable_true_up: subscriptionState.enable_true_up,
			subscription_status: isDraftParam ? SUBSCRIPTION_STATUS.DRAFT : undefined,
			invoice_billing: sanitized.invoiceBillingConfig,
		};

		setIsDraft(isDraftParam);
		createSubscription(payload);
	};

	const handleDraftSubmit = () => {
		handleSubscriptionSubmit(true);
	};

	const handleRegularSubmit = () => {
		handleSubscriptionSubmit(false);
	};

	const navigateBack = () => navigate(`${RouteNames.customers}/${customerId}`);

	const invoiceOptions = [
		{
			value: INVOICE_BILLING.INVOICED_TO_PARENT,
			label: 'Invoice To Parent',
			icon: Building,
			description: 'Invoices will be sent to the parent customer',
		},
		{
			value: INVOICE_BILLING.INVOICED_TO_SELF,
			label: 'Invoice To Self',
			icon: User,
			description: 'Invoices will be sent to this customer',
		},
	];

	const currentInvoiceValue = subscriptionState.invoiceBillingConfig || INVOICE_BILLING.INVOICED_TO_PARENT;
	const selectedInvoiceOption = invoiceOptions.find((opt) => opt.value === currentInvoiceValue) || invoiceOptions[0];

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
					phases={subscriptionState.phases}
					onPhasesChange={(newPhases) => {
						setSubscriptionState((prev) => ({
							...prev,
							phases: newPhases,
						}));
					}}
					allCoupons={allCouponsData}
				/>

				{subscriptionState.selectedPlan && !subscription_id && (
					<div className='flex items-center justify-between'>
						<div className='flex items-center space-x-4'>
							<Button onClick={navigateBack} variant={'outline'} disabled={isCreating}>
								Cancel
							</Button>
							<Button onClick={handleDraftSubmit} isLoading={isCreating && isDraft} variant={'outline'} disabled={isCreating}>
								Save as Draft
							</Button>
						</div>
						<Button onClick={handleRegularSubmit} isLoading={isCreating && !isDraft} disabled={isCreating}>
							Add Subscription
						</Button>
					</div>
				)}
			</div>

			<div className='flex-[4]'>
				{customerData?.parent_customer_id && subscriptionState.selectedPlan && !subscription_id && (
					<div className='sticky top-5'>
						<div className='bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200'>
							<div className='mb-4'>
								<h3 className='text-base font-semibold text-gray-900 mb-1'>Invoice Customer</h3>
								<p className='text-sm text-gray-500'>Choose which customer will receive invoices for this subscription</p>
							</div>
							<div className='space-y-3 mb-4'>
								{invoiceOptions.map((item) => {
									const isSelected = selectedInvoiceOption.value === item.value;
									return (
										<div
											key={item.value}
											onClick={() => {
												if (item.value) {
													setSubscriptionState((prev) => ({
														...prev,
														invoiceBillingConfig: item.value as INVOICE_BILLING,
													}));
												}
											}}
											className={cn(
												'w-full flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200',
												isSelected
													? 'border-[#0F172A] bg-[#0F172A]/5 shadow-sm'
													: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
											)}>
											<div
												className={cn(
													'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
													isSelected ? 'bg-[#0F172A] text-white' : 'bg-gray-100 text-gray-600',
												)}>
												{item.icon && <item.icon className='w-5 h-5' />}
											</div>
											<div className='flex-1 min-w-0'>
												<p className={cn('font-semibold text-sm mb-1', isSelected ? 'text-[#0F172A]' : 'text-gray-900')}>{item.label}</p>
												<p className='text-sm text-gray-500 leading-relaxed'>{item.description}</p>
											</div>
											<div
												className={cn(
													'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
													isSelected ? 'border-[#0F172A] bg-[#0F172A]' : 'border-gray-300 bg-white',
												)}>
												{isSelected && <div className='w-2 h-2 rounded-full bg-white' />}
											</div>
										</div>
									);
								})}
							</div>
							<div className='pt-4 border-t border-gray-100'>
								<p className='text-xs text-gray-500 leading-relaxed'>
									<span className='font-medium text-gray-600'>Note:</span> This setting cannot be changed after the subscription is created.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default CreateCustomerSubscriptionPage;
