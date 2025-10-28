import { Price } from '@/models/Price';
import { useMemo } from 'react';
import {
	formatBillingPeriodForDisplay,
	calculateCouponDiscount,
	getCurrencySymbol,
	calculateTotalCouponDiscount,
} from '@/utils/common/helper_functions';
import { BILLING_PERIOD } from '@/constants/constants';
import { BILLING_CYCLE, SubscriptionPhase } from '@/models/Subscription';
import formatDate from '@/utils/common/format_date';
import { calculateAnniversaryBillingAnchor, calculateCalendarBillingAnchor } from '@/utils/helpers/subscription';
import { cn } from '@/lib/utils';
import { Calendar, Receipt } from 'lucide-react';
import TimelinePreview, { PreviewTimelineItem } from './TimelinePreview';
import { ExpandedPlan } from '@/types';
import { Coupon } from '@/models/Coupon';
import { ExtendedPriceOverride, getCurrentPriceAmount } from '@/utils/common/price_override_helpers';
import { TaxRateOverride } from '@/types/dto/tax';
import { AddAddonToSubscriptionRequest } from '@/types/dto/Addon';
import { useQuery } from '@tanstack/react-query';
import AddonApi from '@/api/AddonApi';

const PERIOD_DURATION: Record<BILLING_PERIOD, string> = {
	[BILLING_PERIOD.DAILY]: '1 day',
	[BILLING_PERIOD.WEEKLY]: '1 week',
	[BILLING_PERIOD.MONTHLY]: '1 month',
	[BILLING_PERIOD.QUARTERLY]: '3 months',
	[BILLING_PERIOD.HALF_YEARLY]: '6 months',
	[BILLING_PERIOD.ANNUAL]: '1 year',
} as const;

interface PreviewProps {
	data: Price[];
	className?: string;
	selectedPlan?: ExpandedPlan | null;
	phases: SubscriptionPhase[];
	coupons?: Coupon[];
	priceOverrides?: Record<string, ExtendedPriceOverride>;
	lineItemCoupons?: Record<string, Coupon>;
	taxRateOverrides?: TaxRateOverride[];
	addons?: AddAddonToSubscriptionRequest[];
}

/**
 * Determines if any charge has ADVANCE invoice cadence
 */
// TODO: This is a temporary function to check if any charge has ADVANCE invoice cadence
// TODO: This should be removed once the invoice cadence is implemented
const hasAdvanceCharge = (charges: Price[]): boolean => {
	return charges?.some((charge) => charge.invoice_cadence === 'ADVANCE') ?? false;
};

/**
 * Generates billing description based on charges and billing period
 */
const getBillingDescription = (charges: Price[], billingPeriod: BILLING_PERIOD, date: Date): string => {
	const period = PERIOD_DURATION[billingPeriod] || formatBillingPeriodForDisplay(billingPeriod).toLowerCase();
	return hasAdvanceCharge(charges) ? `Bills immediately for ${period}` : `Bills on ${formatDate(date)} for ${period}`;
};

/**
 * Calculates the first invoice date based on billing cycle and period
 */
const calculateFirstInvoiceDate = (startDate: Date, billingPeriod: BILLING_PERIOD, billingCycle: BILLING_CYCLE): Date => {
	return billingCycle === BILLING_CYCLE.CALENDAR
		? calculateCalendarBillingAnchor(startDate, billingPeriod)
		: calculateAnniversaryBillingAnchor(startDate, billingPeriod);
};

/**
 * Calculates the total amount with line item coupons applied
 */
const calculateTotalWithLineItemCoupons = (
	charges: Price[],
	priceOverrides: Record<string, ExtendedPriceOverride>,
	lineItemCoupons: Record<string, Coupon>,
): { total: number; lineItemDiscounts: Record<string, number>; totalDiscount: number } => {
	let total = 0;
	let totalDiscount = 0;
	const lineItemDiscounts: Record<string, number> = {};

	charges.forEach((charge) => {
		const currentAmount = getCurrentPriceAmount(charge, priceOverrides);
		const chargeAmount = parseFloat(currentAmount);

		// Only apply line item coupons to FIXED charges, not USAGE/metered charges
		if (charge.type === 'FIXED') {
			const chargeCoupon = lineItemCoupons[charge.id];

			// Calculate discount for this charge
			const chargeDiscount = chargeCoupon ? calculateCouponDiscount(chargeCoupon, chargeAmount) : 0;

			lineItemDiscounts[charge.id] = chargeDiscount;
			totalDiscount += chargeDiscount;
			total += Math.max(0, chargeAmount - chargeDiscount);
		} else {
			// For usage charges, just add the amount without line item coupon discount
			total += chargeAmount;
		}
	});

	return { total, lineItemDiscounts, totalDiscount };
};

/**
 * Calculates addon total based on addon requests and their prices
 */
const calculateAddonTotal = (
	addons: AddAddonToSubscriptionRequest[],
	allAddons: any[],
	billingPeriod: string,
	currency: string,
): { total: number; addonDetails: Array<{ name: string; amount: number }> } => {
	let total = 0;
	const addonDetails: Array<{ name: string; amount: number }> = [];

	addons.forEach((addonRequest) => {
		const addon = allAddons.find((a) => a.id === addonRequest.addon_id);
		if (addon?.prices) {
			// Find the price that matches the billing period and currency
			const matchingPrice = addon.prices.find(
				(price: Price) =>
					price.billing_period.toLowerCase() === billingPeriod.toLowerCase() &&
					price.currency.toLowerCase() === currency.toLowerCase() &&
					price.type === 'FIXED',
			);

			if (matchingPrice) {
				const amount = parseFloat(matchingPrice.amount);
				total += amount;
				addonDetails.push({
					name: addon.name,
					amount: amount,
				});
			}
		}
	});

	return { total, addonDetails };
};

/**
 * Calculates tax amount based on tax rate overrides
 */
const calculateTaxAmount = (subtotal: number, taxRateOverrides: TaxRateOverride[], currency: string): number => {
	if (!taxRateOverrides || taxRateOverrides.length === 0) return 0;

	// Filter tax overrides for the current currency and auto-apply enabled
	const applicableTaxes = taxRateOverrides.filter((tax) => tax.currency.toLowerCase() === currency.toLowerCase() && tax.auto_apply);

	// For simplicity, we'll assume a basic tax calculation
	// In a real implementation, you would fetch tax rates and calculate properly
	// For now, let's assume a 10% tax rate for demo purposes
	// TODO: Implement proper tax rate fetching and calculation

	if (applicableTaxes.length > 0) {
		// For demo purposes, applying a 10% tax
		return subtotal * 0.1;
	}

	return 0;
};

/**
 * Component that displays subscription preview information including start date and first invoice details
 */
const Preview = ({
	data,
	className,
	phases,
	coupons = [],
	priceOverrides = {},
	lineItemCoupons = {},
	taxRateOverrides = [],
	addons = [],
}: PreviewProps) => {
	const firstPhase = phases.at(0);
	const startDate = firstPhase?.start_date;
	const billingCycle = firstPhase?.billing_cycle || BILLING_CYCLE.ANNIVERSARY;

	// Fetch addons data for calculation
	const { data: allAddons = [] } = useQuery({
		queryKey: ['addons'],
		queryFn: async () => {
			const response = await AddonApi.ListAddon({ limit: 1000, offset: 0 });
			return response.items;
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const recurringCharges = useMemo(() => data.filter((charge) => charge.type === 'FIXED'), [data]);

	const { total: recurringTotal, totalDiscount: lineItemTotalDiscount } = useMemo(() => {
		return calculateTotalWithLineItemCoupons(recurringCharges, priceOverrides, lineItemCoupons);
	}, [recurringCharges, priceOverrides, lineItemCoupons]);

	// Calculate addon total
	const billingPeriod = useMemo(() => data[0]?.billing_period.toUpperCase() as BILLING_PERIOD, [data]);
	const currency = useMemo(() => recurringCharges[0]?.currency || 'USD', [recurringCharges]);

	const { total: addonTotal, addonDetails } = useMemo(() => {
		return calculateAddonTotal(addons, allAddons, billingPeriod, currency);
	}, [addons, allAddons, billingPeriod, currency]);

	// Calculate subscription-level coupon discount (applies only to plan, not addons)
	const subscriptionCouponDiscount = useMemo(() => {
		if (coupons.length === 0) return 0;
		return calculateTotalCouponDiscount(coupons, recurringTotal);
	}, [coupons, recurringTotal]);

	// Calculate plan subtotal after discounts (addons are separate)
	const planSubtotalAfterDiscounts = useMemo(() => {
		return Math.max(0, recurringTotal - subscriptionCouponDiscount);
	}, [recurringTotal, subscriptionCouponDiscount]);

	// Calculate total before tax (plan after discount + addons)
	const totalBeforeTax = useMemo(() => {
		return planSubtotalAfterDiscounts + addonTotal;
	}, [planSubtotalAfterDiscounts, addonTotal]);

	// Calculate tax amount (applied to plan after discount + addons)
	const taxAmount = useMemo(() => {
		return calculateTaxAmount(totalBeforeTax, taxRateOverrides, currency);
	}, [totalBeforeTax, taxRateOverrides, currency]);

	// Calculate final total including tax
	const finalTotal = useMemo(() => {
		return totalBeforeTax + taxAmount;
	}, [totalBeforeTax, taxAmount]);

	const firstInvoiceDate = useMemo(() => {
		return startDate ? calculateFirstInvoiceDate(startDate as Date, billingPeriod, billingCycle) : undefined;
	}, [billingCycle, billingPeriod, startDate]);

	const billingDescription = useMemo(() => {
		return firstInvoiceDate ? getBillingDescription(data, billingPeriod, firstInvoiceDate) : '';
	}, [data, billingPeriod, firstInvoiceDate]);

	const timelineItems = useMemo(() => {
		const items: PreviewTimelineItem[] = phases.map((phase, index) => ({
			icon: <Calendar className='h-[22px] w-[22px] text-gray-500 shrink-0' />,
			subtitle: index === 0 ? 'Subscription Start' : 'Subscription Updates',
			label: formatDate(phase.start_date),
		}));

		// Calculate total coupons and discounts
		const totalLineItemCoupons = Object.keys(lineItemCoupons).length;
		const totalCoupons = coupons.length + totalLineItemCoupons;

		// Insert first invoice preview after the first item
		const invoicePreview: PreviewTimelineItem = {
			icon: <Receipt className='h-[22px] w-[22px] text-gray-500 shrink-0' />,
			subtitle: (
				<div>
					<div className='space-y-1'>
						{/* Plan Subtotal */}
						<p className='text-sm text-gray-600'>
							Plan: {getCurrencySymbol(currency || 'USD')}
							{recurringTotal.toFixed(2)}
						</p>

						{/* Addons */}
						{addonTotal > 0 && (
							<>
								<p className='text-sm text-gray-600'>
									Addons: {getCurrencySymbol(currency || 'USD')}
									{addonTotal.toFixed(2)}
								</p>
								{addonDetails.map((addon, index) => (
									<p key={index} className='text-xs text-gray-500 ml-4'>
										• {addon.name}: {getCurrencySymbol(currency || 'USD')}
										{addon.amount.toFixed(2)}
									</p>
								))}
							</>
						)}

						{/* Discounts */}
						{totalCoupons > 0 && (
							<>
								{lineItemTotalDiscount > 0 && (
									<p className='text-sm text-blue-600'>
										Line-item discounts: -{getCurrencySymbol(currency || 'USD')}
										{lineItemTotalDiscount.toFixed(2)}
									</p>
								)}
								{subscriptionCouponDiscount > 0 && (
									<p className='text-sm text-blue-600'>
										Subscription discount: -{getCurrencySymbol(currency || 'USD')}
										{subscriptionCouponDiscount.toFixed(2)}
									</p>
								)}
							</>
						)}

						{/* Tax */}
						{taxAmount > 0 && (
							<p className='text-sm text-gray-600'>
								Tax: {getCurrencySymbol(currency || 'USD')}
								{taxAmount.toFixed(2)}
							</p>
						)}

						{/* Final total */}
						<p className='text-sm text-gray-900 font-semibold border-t border-gray-200 pt-1'>
							Net payable: {getCurrencySymbol(currency || 'USD')}
							{finalTotal.toFixed(2)}
						</p>
					</div>

					{totalCoupons > 0 && (
						<p className='text-xs text-gray-500 mt-2'>
							{totalCoupons} coupon{totalCoupons > 1 ? 's' : ''} applied
							{lineItemTotalDiscount > 0 && totalLineItemCoupons > 0 && (
								<span className='ml-1'>
									({totalLineItemCoupons} line-item, {coupons.length} subscription)
								</span>
							)}
						</p>
					)}

					<p className='text-sm text-gray-600 mt-2'>{billingDescription}</p>
				</div>
			),
			label: `First invoice: ${firstInvoiceDate ? formatDate(firstInvoiceDate) : ''}`,
		};

		const updatedItems = [items[0], invoicePreview, ...items.slice(1)];

		// Add end date if it exists
		const lastPhase = phases[phases.length - 1];
		if (lastPhase.end_date) {
			updatedItems.push({
				icon: <Calendar className='h-[22px] w-[22px] text-gray-500 shrink-0' />,
				subtitle: 'Subscription ends',
				label: formatDate(lastPhase.end_date),
			});
		}

		return updatedItems;
	}, [
		phases,
		firstInvoiceDate,
		recurringTotal,
		addonTotal,
		addonDetails,
		billingDescription,
		coupons,
		lineItemCoupons,
		lineItemTotalDiscount,
		subscriptionCouponDiscount,
		taxAmount,
		finalTotal,
		currency,
	]);

	return (
		<div className={cn('w-full', className)}>
			<TimelinePreview items={timelineItems} />
		</div>
	);
};

export default Preview;
