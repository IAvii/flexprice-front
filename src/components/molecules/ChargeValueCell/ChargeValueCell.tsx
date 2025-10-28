import { BILLING_MODEL, Price, PRICE_TYPE, TIER_MODE } from '@/models';
import { getPriceTableCharge, calculateDiscountedPrice } from '@/utils';
import { Info } from 'lucide-react';
import { formatAmount } from '@/components/atoms/Input/Input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { getCurrencySymbol } from '@/utils';
import { Coupon } from '@/models';
import { formatCouponName } from '@/utils';
import { ExtendedPriceOverride } from '@/utils';
import { cn } from '@/lib/utils';

interface Props {
	data: Price;
	overriddenAmount?: string;
	appliedCoupon?: Coupon | null;
	priceOverride?: ExtendedPriceOverride;
}

const ChargeValueCell = ({ data, overriddenAmount, appliedCoupon, priceOverride }: Props) => {
	// Helper functions
	const formatPriceDisplay = (
		amount: string,
		currency: string,
		billingModel: BILLING_MODEL | 'SLAB_TIERED',
		transformQuantity?: any,
		tiers?: any[] | null,
	) => {
		const currencySymbol = getCurrencySymbol(currency);

		switch (billingModel) {
			case BILLING_MODEL.PACKAGE: {
				const divideBy = transformQuantity?.divide_by || 1;
				return `${currencySymbol}${formatAmount(amount)} / ${divideBy} units`;
			}
			case BILLING_MODEL.TIERED:
			case 'SLAB_TIERED': {
				const firstTier = tiers?.[0];
				return `starts at ${currencySymbol}${formatAmount(firstTier?.unit_amount || '0')} per unit`;
			}
			default:
				return `${currencySymbol}${formatAmount(amount)}`;
		}
	};

	const renderOverrideTooltip = () => {
		if (!priceOverride) return null;

		const changes: string[] = [];

		// Check for billing model changes
		if (priceOverride.billing_model && priceOverride.billing_model !== data.billing_model) {
			const originalModel = data.billing_model;
			const newModel = priceOverride.billing_model;

			// Create more descriptive billing model names
			const getBillingModelLabel = (model: string) => {
				switch (model) {
					case BILLING_MODEL.FLAT_FEE:
						return 'Flat Fee';
					case BILLING_MODEL.PACKAGE:
						return 'Package';
					case BILLING_MODEL.TIERED:
						return 'Volume Tiered';
					case 'SLAB_TIERED':
						return 'Slab Tiered';
					default:
						return model;
				}
			};

			changes.push(`Billing Model: ${getBillingModelLabel(originalModel)} → ${getBillingModelLabel(newModel)}`);
		}

		// Check for tier mode changes
		if (priceOverride.tier_mode && priceOverride.tier_mode !== data.tier_mode) {
			const originalMode = data.tier_mode;
			const newMode = priceOverride.tier_mode;

			// Create more descriptive tier mode names
			const getTierModeLabel = (mode: string) => {
				switch (mode) {
					case TIER_MODE.VOLUME:
						return 'Volume';
					case TIER_MODE.SLAB:
						return 'Slab';
					default:
						return mode;
				}
			};

			changes.push(`Tier Mode: ${getTierModeLabel(originalMode)} → ${getTierModeLabel(newMode)}`);
		}

		// Check for amount changes
		if (priceOverride.amount && priceOverride.amount !== data.amount) {
			changes.push(
				`Amount: ${getCurrencySymbol(data.currency)}${formatAmount(data.amount)} → ${getCurrencySymbol(data.currency)}${formatAmount(priceOverride.amount)}`,
			);
		}

		// Check for quantity changes - only show if original price was usage-based
		if (priceOverride.quantity && priceOverride.quantity !== 1 && data.type === PRICE_TYPE.USAGE) {
			changes.push(`Quantity: 1 → ${priceOverride.quantity}`);
		}

		// Check for transform quantity changes - only show if original price was package or if billing model changed to package
		if (
			priceOverride.transform_quantity &&
			(data.billing_model === BILLING_MODEL.PACKAGE || priceOverride.billing_model === BILLING_MODEL.PACKAGE)
		) {
			const originalDivideBy = (data.transform_quantity as any)?.divide_by || 1;
			const newDivideBy = priceOverride.transform_quantity.divide_by;
			if (originalDivideBy !== newDivideBy) {
				changes.push(`Package Size: ${originalDivideBy} units → ${newDivideBy} units`);
			}
		}

		// Check for tier changes
		if (priceOverride.tiers && priceOverride.tiers.length > 0) {
			const originalTiers = data.tiers || [];
			const newTiers = priceOverride.tiers;

			// If tier count changed, show the change
			if (originalTiers.length !== newTiers.length) {
				changes.push(`Tiers: ${originalTiers.length} tiers → ${newTiers.length} tiers`);
			} else {
				// Show detailed tier changes in dropdown format
				const tierChanges: string[] = [];
				newTiers.forEach((newTier, index) => {
					const originalTier = originalTiers[index];
					if (originalTier) {
						const tierChangesForThisTier: string[] = [];

						// Check From value changes
						const originalFrom = index === 0 ? 0 : originalTiers[index - 1]?.up_to || 0;
						const newFrom = index === 0 ? 0 : newTiers[index - 1]?.up_to || 0;
						if (originalFrom !== newFrom) {
							tierChangesForThisTier.push(`From (>): ${originalFrom} → ${newFrom}`);
						}

						// Check Up to value changes
						const originalUpTo = originalTier.up_to;
						const newUpTo = newTier.up_to;
						if (originalUpTo !== newUpTo) {
							const originalUpToDisplay = originalUpTo === null || originalUpTo === undefined ? '∞' : originalUpTo.toString();
							const newUpToDisplay = newUpTo === null || newUpTo === undefined ? '∞' : newUpTo.toString();
							tierChangesForThisTier.push(`Up to (<=): ${originalUpToDisplay} → ${newUpToDisplay}`);
						}

						// Check unit amount changes
						if (originalTier.unit_amount !== newTier.unit_amount) {
							tierChangesForThisTier.push(
								`Per unit price: ${getCurrencySymbol(data.currency)}${formatAmount(originalTier.unit_amount)} → ${getCurrencySymbol(data.currency)}${formatAmount(newTier.unit_amount)}`,
							);
						}

						// Check flat amount changes
						if ((originalTier.flat_amount || '0') !== (newTier.flat_amount || '0')) {
							tierChangesForThisTier.push(
								`Flat fee: ${getCurrencySymbol(data.currency)}${formatAmount(originalTier.flat_amount || '0')} → ${getCurrencySymbol(data.currency)}${formatAmount(newTier.flat_amount || '0')}`,
							);
						}

						if (tierChangesForThisTier.length > 0) {
							tierChanges.push(`Tier ${index + 1}: ${tierChangesForThisTier.join(', ')}`);
						}
					} else {
						// New tier added - format like table structure
						const newFrom = index === 0 ? 0 : newTiers[index - 1]?.up_to || 0;
						const newUpToDisplay = newTier.up_to === null || newTier.up_to === undefined ? '∞' : newTier.up_to.toString();
						tierChanges.push(
							`Tier ${index + 1} added: From (>): ${newFrom}, Up to (<=): ${newUpToDisplay}, Per unit price: ${getCurrencySymbol(data.currency)}${formatAmount(newTier.unit_amount)}, Flat fee: ${getCurrencySymbol(data.currency)}${formatAmount(newTier.flat_amount || '0')}`,
						);
					}
				});

				if (tierChanges.length > 0) {
					changes.push(...tierChanges);
				} else {
					changes.push('Tier structure modified');
				}
			}
		}

		// If no specific changes detected but we have overrides, show generic message
		if (changes.length === 0 && Object.keys(priceOverride).length > 0) {
			changes.push('Price configuration modified');
		}

		if (changes.length === 0) return null;

		return (
			<div className='space-y-2'>
				<div className='font-medium text-gray-900'>Price Override Applied</div>
				{changes.map((change, index) => {
					// Check if this is a tier change that should be formatted as a table
					if (change.startsWith('Tier ') && change.includes(':')) {
						const tierInfo = change.split(': ');
						const tierHeader = tierInfo[0];
						const tierDetails = tierInfo[1];

						return (
							<div key={index} className='text-sm text-gray-600 space-y-1'>
								<div className='font-medium'>{tierHeader}:</div>
								<div className='ml-2 space-y-1'>
									{tierDetails.split(', ').map((detail, detailIndex) => (
										<div key={detailIndex} className='text-xs'>
											• {detail}
										</div>
									))}
								</div>
							</div>
						);
					}

					// Regular change format
					return (
						<div key={index} className='text-sm text-gray-600'>
							• {change}
						</div>
					);
				})}
			</div>
		);
	};

	const renderTieredPricingTooltip = () => {
		if (!isTiered) return null;

		const tiers = priceOverride?.tiers || data.tiers;
		if (!tiers?.length) return null;

		const formatRange = (tier: any, index: number, allTiers: any[]) => {
			// For the first tier, start from 0
			const from = index === 0 ? 0 : allTiers[index - 1]?.up_to || 0;

			// If up_to is null or this is the last tier, show infinity
			if (tier.up_to === null || tier.up_to === undefined || index === allTiers.length - 1) {
				return `${from} - ∞`;
			}

			// Otherwise show the actual range
			return `${from} - ${tier.up_to}`;
		};

		return (
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>
						<Info className={cn(hasOverrides && 'text-orange-600', 'h-4 w-4  transition-colors duration-150')} />
					</TooltipTrigger>
					<TooltipContent
						sideOffset={5}
						className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[320px]'>
						<div className='space-y-3'>
							<div className='font-medium border-b border-spacing-1 border-gray-200 pb-2 text-base text-gray-900'>
								{effectiveTierMode === TIER_MODE.VOLUME ? 'Volume' : 'Slab'} Tier Pricing
								{hasOverrides && <span className='text-xs text-orange-600 ml-2'>(Overridden)</span>}
							</div>
							<div className='space-y-2'>
								{tiers.map((tier, index) => (
									<div key={index} className='flex flex-col gap-1'>
										<div className='flex items-center justify-between gap-6'>
											<div className='!font-normal text-muted-foreground'>{formatRange(tier, index, tiers)} units</div>
											<div className='text-right'>
												<div className='!font-normal text-muted-foreground'>
													{getCurrencySymbol(data.currency)}
													{formatAmount(tier.unit_amount)} per unit
												</div>
												{Number(tier.flat_amount) > 0 && (
													<div className='text-xs text-gray-500'>
														+ {getCurrencySymbol(data.currency)}
														{formatAmount(tier.flat_amount || '0')} flat fee
													</div>
												)}
											</div>
										</div>
										{index < tiers.length - 1 && <div className='h-px bg-gray-100' />}
									</div>
								))}
							</div>
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	};

	// Main price display logic
	const getMainPriceDisplay = () => {
		// If we have price overrides, prioritize showing the overridden values
		if (hasOverrides && priceOverride) {
			// Determine the effective billing model and tier mode
			const effectiveBillingModel = priceOverride.billing_model || data.billing_model;
			const effectiveAmount = priceOverride.amount || data.amount;
			const effectiveTransformQuantity = priceOverride.transform_quantity || data.transform_quantity;
			const effectiveTiers = priceOverride.tiers || data.tiers;

			// Handle SLAB_TIERED billing model
			if (effectiveBillingModel === 'SLAB_TIERED') {
				return formatPriceDisplay(effectiveAmount, data.currency, 'SLAB_TIERED', undefined, effectiveTiers);
			}

			// Handle PACKAGE billing model
			if (effectiveBillingModel === BILLING_MODEL.PACKAGE) {
				return formatPriceDisplay(effectiveAmount, data.currency, BILLING_MODEL.PACKAGE, effectiveTransformQuantity);
			}

			// Handle TIERED billing model
			if (effectiveBillingModel === BILLING_MODEL.TIERED) {
				return formatPriceDisplay(effectiveAmount, data.currency, BILLING_MODEL.TIERED, undefined, effectiveTiers);
			}

			// Handle other billing models (fallback)
			if (effectiveBillingModel && effectiveBillingModel !== data.billing_model) {
				return formatPriceDisplay(effectiveAmount, data.currency, effectiveBillingModel, effectiveTransformQuantity, effectiveTiers);
			}

			// Handle FLAT_FEE billing model
			if (effectiveBillingModel === BILLING_MODEL.FLAT_FEE) {
				return formatPriceDisplay(effectiveAmount, data.currency, BILLING_MODEL.FLAT_FEE);
			}

			// Fallback for any other billing model with overrides
			return formatPriceDisplay(effectiveAmount, data.currency, data.billing_model, effectiveTransformQuantity, effectiveTiers);
		}

		// Fallback to original logic for non-overridden prices
		const priceData = overriddenAmount ? { ...data, amount: overriddenAmount } : data;
		return getPriceTableCharge(priceData as any, false);
	};

	// Computed values
	const effectiveBillingModel = priceOverride?.billing_model || data.billing_model;
	const effectiveTierMode = priceOverride?.tier_mode || data.tier_mode;
	const tiers = priceOverride?.tiers || data.tiers;
	const isTiered =
		(effectiveBillingModel === BILLING_MODEL.TIERED || effectiveBillingModel === 'SLAB_TIERED') && Array.isArray(tiers) && tiers.length > 0;

	const discountInfo = !overriddenAmount && appliedCoupon ? calculateDiscountedPrice(data, appliedCoupon) : null;
	const hasOverrides =
		priceOverride &&
		(priceOverride.billing_model !== undefined ||
			priceOverride.tier_mode !== undefined ||
			priceOverride.tiers !== undefined ||
			priceOverride.quantity !== undefined ||
			priceOverride.transform_quantity !== undefined);

	return (
		<div className='flex items-center gap-2'>
			{/* Discounted Price Display */}
			{discountInfo ? (
				<div className='flex items-center gap-2'>
					<div className='flex flex-col'>
						<div className='line-through text-gray-400 text-sm'>
							{getCurrencySymbol(data.currency)}
							{formatAmount(discountInfo.originalAmount.toString())}
						</div>
						<div className='text-gray-900 font-medium'>
							{getCurrencySymbol(data.currency)}
							{formatAmount(discountInfo.discountedAmount.toString())}
						</div>
					</div>
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger>
								<Info className='h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors duration-150' />
							</TooltipTrigger>
							<TooltipContent
								sideOffset={5}
								className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-3 py-2 rounded-lg'>
								<div className='font-medium'>{appliedCoupon ? formatCouponName(appliedCoupon) : 'No coupon applied'}</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			) : (
				/* Main Price Display */
				<div>{getMainPriceDisplay()}</div>
			)}

			{/* Override Indicator Tooltip */}
			{hasOverrides && !isTiered && (
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger>
							<Info className='h-4 w-4 text-orange-600 hover:text-orange-600 transition-colors duration-150' />
						</TooltipTrigger>
						<TooltipContent
							sideOffset={5}
							className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[300px]'>
							<div className='space-y-2'>
								<div className='text-sm text-gray-600'>{renderOverrideTooltip()}</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}

			{/* Tiered Pricing Tooltip */}
			{renderTieredPricingTooltip()}
		</div>
	);
};

export default ChargeValueCell;
