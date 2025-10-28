import { Check, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Button } from '@/components/ui';
import { formatBillingPeriodForPrice, getCurrencySymbol } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import { RouteNames } from '@/core/routes/Routes';
import { formatAmount } from '@/components/atoms/Input/Input';
import { PlanType } from '@/pages';
export interface UsageCharge {
	amount?: string;
	currency?: string;
	billing_model: string;
	tiers?: Array<{
		up_to: number | null;
		unit_amount: string;
		flat_amount: string;
	}> | null;
	matter_name?: string;
	meter_name?: string;
}

export interface PricingCardProps {
	id: string;
	name: string;
	description: string;
	price: {
		amount?: string;
		currency?: string;
		billingPeriod?: string;
		type?: string;
		displayType: PlanType;
	};
	usageCharges?: UsageCharge[];
	entitlements: Array<{
		id: string;
		feature_id: string;
		name: string;
		type: 'STATIC' | 'BOOLEAN' | 'METERED';
		value: string | number | boolean;
		description?: string;
		usage_reset_period?: string;
	}>;
	onPurchase?: () => void;
	className?: string;
	showUsageCharges?: boolean;
}

const formatEntitlementValue = ({
	type,
	value,
	name,
	usage_reset_period,
	feature_id,
}: {
	type: string;
	value: string | number | boolean;
	name: string;
	usage_reset_period: string;
	feature_id: string;
}) => {
	const feature = feature_id ? (
		<Link
			to={`${RouteNames.featureDetails}/${feature_id}`}
			className='hover:underline decoration-dashed decoration-[0.5px] decoration-muted-foreground/50 underline-offset-4'>
			{name}
		</Link>
	) : (
		name
	);

	switch (type) {
		case 'STATIC':
			return (
				<>
					{value} {feature}
				</>
			);
		case 'BOOLEAN':
			return <>{value ? feature : `${feature} Not included`}</>;
		case 'METERED':
			return (
				<>
					{formatAmount(value.toString())} {feature}
					{usage_reset_period ? ` per ${formatBillingPeriodForPrice(usage_reset_period)}` : ''}
				</>
			);
		default:
			return `${value} ${feature}`;
	}
};

const PRICE_DISPLAY_CONFIG = {
	[PlanType.FREE]: { text: 'Free', showBillingPeriod: false, subtext: '' },
	[PlanType.HYBRID_FREE]: { text: '0', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.HYBRID_PAID]: { text: '', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.USAGE_ONLY]: { text: '0', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.FIXED]: { text: '', showBillingPeriod: true, subtext: '' },
} as const;

const formatUsageCharge = (charge: UsageCharge) => {
	if (!charge.amount) return '';

	if (charge.billing_model === 'PACKAGE') {
		return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per package`;
	} else if (charge.billing_model === 'FLAT_FEE') {
		return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per unit`;
	} else if (charge.billing_model === 'TIERED' && charge.tiers?.length) {
		return `Starting at ${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.tiers[0].unit_amount)} per unit`;
	}
	return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per unit`;
};

const UsageChargeTooltip: React.FC<{ charge: UsageCharge }> = ({ charge }) => {
	if (charge.billing_model !== 'TIERED' || !charge.tiers) {
		return null;
	}

	const formatRange = (tier: any, index: number, allTiers: any[]) => {
		const from = index === 0 ? 1 : allTiers[index - 1].up_to + 1;
		if (tier.up_to === null || index === allTiers.length - 1) {
			return `${from} - ∞`;
		}
		return `${from} - ${tier.up_to}`;
	};

	return (
		<TooltipContent
			sideOffset={5}
			className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[320px]'>
			<div className='space-y-3'>
				<div className='font-medium border-b border-spacing-1 border-gray-200 pb-2 text-base text-gray-900'>Volume Pricing</div>
				<div className='space-y-2'>
					{charge.tiers.map((tier, index) => (
						<div key={index} className='flex flex-col gap-1'>
							<div className='flex items-center justify-between gap-6'>
								<div className='!font-normal text-muted-foreground'>{formatRange(tier, index, charge.tiers || [])} units</div>
								<div className='text-right'>
									<div className='!font-normal text-muted-foreground'>
										{getCurrencySymbol(charge.currency || '')}
										{formatAmount(tier.unit_amount)} per unit
									</div>
									{Number(tier.flat_amount) > 0 && (
										<div className='text-xs text-gray-500'>
											+ {getCurrencySymbol(charge.currency || '')}
											{formatAmount(tier.flat_amount)} flat fee
										</div>
									)}
								</div>
							</div>
							{index < (charge.tiers?.length || 0) - 1 && <div className='h-px bg-gray-100' />}
						</div>
					))}
				</div>
			</div>
		</TooltipContent>
	);
};

const PricingCard: React.FC<PricingCardProps> = ({
	id,
	name,
	price,
	usageCharges = [],
	entitlements,
	className = '',
	showUsageCharges = false,
}) => {
	const navigate = useNavigate();
	const config = PRICE_DISPLAY_CONFIG[price.displayType];
	const displayAmount = config.text || `${getCurrencySymbol(price.currency || '')}${formatAmount(price.amount || '')}`;
	const hasUsageCharges = usageCharges.length > 0;

	return (
		<div className={`rounded-3xl border border-gray-200 p-7 bg-white hover:border-gray-300 transition-all shadow-md ${className}`}>
			{/* Header */}
			<div className='space-y-2'>
				<h3 className='text-xl font-[300] text-gray-900'>{name}</h3>
				{/* <p className='text-sm font-normal text-gray-500 leading-relaxed'>{description}</p> */}
			</div>

			{/* Price */}
			<div className='mt-6 space-y-4'>
				{/* Base Price */}
				<div className='flex flex-col'>
					<div className='flex items-baseline'>
						<span className='text-4xl font-normal text-gray-900'>
							{config.text === '0' ? `${getCurrencySymbol(price.currency || '')}0` : displayAmount}
						</span>
						{config.showBillingPeriod && (
							<span className='text3 ml-2 text-sm text-gray-500'>
								/{formatBillingPeriodForPrice(price.billingPeriod || '')}
								{config.subtext && <span className='ml-1 font-medium text-lg'>{config.subtext}</span>}
							</span>
						)}
					</div>
					{hasUsageCharges && showUsageCharges && (
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger>
									<Info className='h-4 w-4 text-gray-400 hover:text-gray-500 transition-colors duration-150' />
								</TooltipTrigger>
								<TooltipContent
									sideOffset={5}
									className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[320px]'>
									<div className='space-y-2'>
										{usageCharges.map((charge, index) => (
											<div key={index} className='flex items-center justify-between gap-4'>
												<span className='font-medium'>{charge.meter_name}:</span>
												<span>{formatUsageCharge(charge)}</span>
											</div>
										))}
									</div>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>

				{/* Usage Charges Section */}
				{hasUsageCharges && showUsageCharges && (
					<div className='border-t pt-4'>
						<div className='text-sm font-medium text-gray-900 mb-2'>Usage-based charges:</div>
						<div className='space-y-2'>
							{usageCharges.map((charge, index) => (
								<div key={index} className='flex items-center gap-2 text-sm text-gray-600'>
									<span>{charge.meter_name}:</span>
									<span>{formatUsageCharge(charge)}</span>
									{charge.billing_model === 'TIERED' && charge.tiers && (
										<TooltipProvider delayDuration={0}>
											<Tooltip>
												<TooltipTrigger>
													<Info className='h-4 w-4 text-gray-400 hover:text-gray-500 transition-colors duration-150' />
												</TooltipTrigger>
												<UsageChargeTooltip charge={charge} />
											</Tooltip>
										</TooltipProvider>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Purchase Button */}
			<div className='mt-6'>
				<Button
					onClick={() => {
						navigate(`${RouteNames.plan}/${id}`);
					}}
					className='w-full bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl py-3 text-sm font-medium transition-colors'
					variant='outline'>
					View plan
				</Button>
			</div>

			{/* Features List */}
			<div className='mt-7'>
				{entitlements.length > 0 ? (
					<ul className='space-y-3.5'>
						{entitlements.map((entitlement) => (
							<li key={entitlement.id} className='flex items-center gap-3'>
								<Check className='h-[18px] w-[18px] text-gray-600 flex-shrink-0' />
								<span className='flex-1 text-[15px] text-gray-600 font-normal'>
									{formatEntitlementValue({
										type: entitlement.type,
										value: entitlement.value,
										name: entitlement.name,
										usage_reset_period: entitlement.usage_reset_period || '',
										feature_id: entitlement.feature_id,
									})}
								</span>
								{entitlement.description && (
									<TooltipProvider delayDuration={0}>
										<Tooltip>
											<TooltipTrigger className='cursor-pointer'>
												<Info className='h-4 w-4 text-gray-400 hover:text-gray-500 transition-colors duration-150' />
											</TooltipTrigger>
											<TooltipContent sideOffset={5} className='bg-gray-900 text-xs text-white px-3 py-1.5 rounded-lg max-w-[200px]'>
												{entitlement.description}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</li>
						))}
					</ul>
				) : (
					<div className='text-center'>
						{/* <p className='text-sm text-gray-500 mb-2'>No entitlements added yet</p> */}
						<button
							onClick={() => navigate(`${RouteNames.plan}/${id}`)}
							className='text-sm text-gray-900 underline decoration-dashed decoration-[0.5px] decoration-muted-foreground/50 underline-offset-4 hover:text-gray-700 transition-colors'>
							Add entitlements
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default PricingCard;
