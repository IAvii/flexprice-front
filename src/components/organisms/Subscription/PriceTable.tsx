import { FC, useMemo, useState } from 'react';
import { ColumnData, FlexpriceTable, LineItemCoupon } from '@/components/molecules';
import PriceOverrideDialog from '@/components/molecules/PriceOverrideDialog/PriceOverrideDialog';
import CommitmentConfigDialog from '@/components/molecules/CommitmentConfigDialog';
import { Price, PRICE_TYPE } from '@/models';
import { ChevronDownIcon, ChevronUpIcon, Pencil, RotateCcw, Tag, Target } from 'lucide-react';
import { FormHeader, DecimalUsageInput } from '@/components/atoms';
import { motion } from 'framer-motion';
import { ChargeValueCell } from '@/components/molecules';
import { capitalize } from 'es-toolkit';
import { Coupon } from '@/models';
import { BsThreeDots } from 'react-icons/bs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { ExtendedPriceOverride } from '@/utils';
import { LineItemCommitmentConfig } from '@/types/dto/LineItemCommitmentConfig';

export interface Props {
	data: Price[];
	billingPeriod?: string;
	currency?: string;
	onPriceOverride?: (priceId: string, override: Partial<ExtendedPriceOverride>) => void;
	onResetOverride?: (priceId: string) => void;
	overriddenPrices?: Record<string, ExtendedPriceOverride>;
	lineItemCoupons?: Record<string, Coupon>;
	onLineItemCouponsChange?: (priceId: string, coupon: Coupon | null) => void;
	onCommitmentChange?: (priceId: string, config: LineItemCommitmentConfig | null) => void;
	disabled?: boolean;
	subscriptionLevelCoupon?: Coupon | null; // For tracking subscription level coupon
}

type ChargeTableData = {
	charge: JSX.Element;
	quantity: string | JSX.Element;
	price: JSX.Element;
	invoice_cadence: string;
	actions?: JSX.Element;
	priceId: string;
};

const PriceTable: FC<Props> = ({
	data,
	billingPeriod,
	currency,
	onPriceOverride,
	onResetOverride,
	overriddenPrices = {},
	lineItemCoupons = {},
	onLineItemCouponsChange,
	onCommitmentChange,
	disabled = false,
	subscriptionLevelCoupon = null,
}) => {
	const [showAllRows, setShowAllRows] = useState(false);
	const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedCommitmentPrice, setSelectedCommitmentPrice] = useState<Price | null>(null);
	const [isCommitmentDialogOpen, setIsCommitmentDialogOpen] = useState(false);
	const [couponModalState, setCouponModalState] = useState<{ isOpen: boolean; priceId: string | null }>({
		isOpen: false,
		priceId: null,
	});
	// Track in-progress quantity text so backspacing to empty is allowed before committing
	const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

	// Filter prices based on billing period and currency if provided
	const filteredPrices = useMemo(() => {
		let filtered = data;

		if (billingPeriod) {
			filtered = filtered.filter((price) => price.billing_period.toLowerCase() === billingPeriod.toLowerCase());
		}

		if (currency) {
			filtered = filtered.filter((price) => price.currency.toLowerCase() === currency.toLowerCase());
		}

		return filtered;
	}, [data, billingPeriod, currency]);

	const handleOverride = (price: Price) => {
		// Remove any existing coupon for this line item when overriding price
		const appliedCoupon = lineItemCoupons[price.id];
		if (appliedCoupon) {
			onLineItemCouponsChange?.(price.id, null);
		}

		setSelectedPrice(price);
		setIsDialogOpen(true);
	};

	const handleConfigureCommitment = (price: Price) => {
		setSelectedCommitmentPrice(price);
		setIsCommitmentDialogOpen(true);
	};

	// Custom action component for price rows
	const PriceActionMenu: FC<{ price: Price }> = ({ price }) => {
		const [isDropdownOpen, setIsDropdownOpen] = useState(false);
		// Now all billing models are overridable with the new comprehensive dialog
		const isOverridden = overriddenPrices[price.id] !== undefined;
		const priceHasCommitment = overriddenPrices[price.id]?.commitment !== undefined;

		const handleClick = (e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDropdownOpen(!isDropdownOpen);
		};

		return (
			<div data-interactive='true' onClick={handleClick}>
				<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
					<DropdownMenuTrigger asChild>
						<button>
							<BsThreeDots className='text-base size-4' />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end' className='w-48'>
						<DropdownMenuItem onClick={() => handleOverride(price)}>
							<Pencil className='mr-2 h-4 w-4' />
							{isOverridden ? 'Edit Override' : 'Override Price'}
						</DropdownMenuItem>
						{isOverridden && (
							<DropdownMenuItem onClick={() => onResetOverride?.(price.id)}>
								<RotateCcw className='mr-2 h-4 w-4' />
								Reset Override
							</DropdownMenuItem>
						)}
						<DropdownMenuItem onClick={() => handleConfigureCommitment(price)}>
							<Target className='mr-2 h-4 w-4' />
							{priceHasCommitment ? 'Edit Commitment' : 'Configure Commitment'}
						</DropdownMenuItem>
						{!isOverridden && (
							<DropdownMenuItem onClick={() => setCouponModalState({ isOpen: true, priceId: price.id })}>
								<Tag className='mr-2 h-4 w-4' />
								Apply Coupon
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	};

	const mappedData: ChargeTableData[] = (filteredPrices ?? []).map((price) => {
		const isOverridden = overriddenPrices[price.id] !== undefined;
		const appliedCoupon = lineItemCoupons[price.id];

		return {
			priceId: price.id,
			charge: (
				<div>
					<div>{price.display_name ? `${price.display_name}` : price.meter?.name || 'Charge'}</div>
				</div>
			),
			quantity: (() => {
				if (price.type === PRICE_TYPE.FIXED) {
					// Calculate minimum quantity from price or default to 1
					const minQuantity = price.min_quantity || 1;
					// Get current quantity from override or default to min_quantity
					const currentQuantity = overriddenPrices[price.id]?.quantity ?? minQuantity;
					const displayQuantity = quantityInputs[price.id] ?? currentQuantity.toString();

					return (
						<div className='w-20' data-interactive='true'>
							<DecimalUsageInput
								value={displayQuantity}
								onChange={(value) => {
									// Allow empty while the user edits; don't force min immediately
									if (value === '') {
										setQuantityInputs((prev) => ({ ...prev, [price.id]: '' }));
										return;
									}

									const quantity = parseInt(value, 10) || minQuantity;

									if (quantity === minQuantity) {
										// If quantity is back to default (min_quantity), remove the override if it only contains quantity
										const currentOverride = overriddenPrices[price.id];
										if (
											currentOverride &&
											Object.keys(currentOverride).length === 2 &&
											currentOverride.price_id &&
											currentOverride.quantity
										) {
											onResetOverride?.(price.id);
										} else if (currentOverride) {
											// Remove only the quantity from the override
											const { quantity: _, ...restOverride } = currentOverride;
											onPriceOverride?.(price.id, restOverride);
										}
									} else {
										// Clear any existing coupon when quantity is overridden
										const appliedCoupon = lineItemCoupons[price.id];
										if (appliedCoupon) {
											onLineItemCouponsChange?.(price.id, null);
										}

										// Create or update override with quantity
										onPriceOverride?.(price.id, { quantity });
									}

									// Clear transient input state once value is committed
									setQuantityInputs((prev) => {
										const next = { ...prev };
										if (value === quantity.toString()) {
											delete next[price.id];
										} else {
											next[price.id] = value;
										}
										return next;
									});
								}}
								placeholder={minQuantity.toString()}
								disabled={disabled}
								precision={0}
							/>
						</div>
					);
				}

				return 'pay as you go';
			})(),
			price: (
				<ChargeValueCell
					data={{ ...price, currency: price.currency } as any}
					overriddenAmount={isOverridden ? overriddenPrices[price.id]?.amount : undefined}
					appliedCoupon={appliedCoupon}
					priceOverride={isOverridden ? overriddenPrices[price.id] : undefined}
				/>
			),
			invoice_cadence: price.invoice_cadence,
			actions: <PriceActionMenu price={price} />,
		};
	});

	const columns: ColumnData<ChargeTableData>[] = [
		{
			fieldName: 'charge',
			title: 'Charge',
		},
		{
			title: 'Billing Period',
			render: (data) => {
				return capitalize(data.invoice_cadence) || '--';
			},
		},
		{
			fieldName: 'quantity',
			title: 'Quantity',
		},
		{
			fieldName: 'price',
			title: 'Price',
		},
		{
			fieldName: 'actions',
			title: '',
			width: 50,
			align: 'center',
			fieldVariant: 'interactive',
		},
	];

	const displayedData = showAllRows ? mappedData : mappedData.slice(0, 5);

	return (
		<div className='space-y-4'>
			<div>
				<FormHeader title='Charges' variant='sub-header' />
			</div>
			<div className='rounded-xl border border-gray-300'>
				<motion.div
					initial={{ height: 'auto' }}
					// animate={{ height: showAllRows ? 'auto' : 200 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					style={{ overflow: 'hidden' }}>
					<FlexpriceTable columns={columns} data={displayedData} />
				</motion.div>
			</div>
			{mappedData.length > 5 && (
				<div className='flex justify-center mt-3'>
					<button
						onClick={() => setShowAllRows((prev) => !prev)}
						className='flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-md hover:bg-gray-50'>
						{showAllRows ? (
							<>
								<span>Show less</span>
								<ChevronUpIcon className='w-4 h-4' />
							</>
						) : (
							<>
								<span>Show {mappedData.length - 5} more</span>
								<ChevronDownIcon className='w-4 h-4' />
							</>
						)}
					</button>
				</div>
			)}

			{/* Comprehensive Price Override Dialog */}
			{selectedPrice && (
				<PriceOverrideDialog
					isOpen={isDialogOpen}
					onOpenChange={setIsDialogOpen}
					price={selectedPrice}
					onPriceOverride={onPriceOverride || (() => { })}
					onResetOverride={onResetOverride || (() => { })}
					overriddenPrices={overriddenPrices}
				/>
			)}

			{/* Commitment Configuration Dialog */}
			{selectedCommitmentPrice && (
				<CommitmentConfigDialog
					isOpen={isCommitmentDialogOpen}
					onOpenChange={setIsCommitmentDialogOpen}
					price={selectedCommitmentPrice}
					onSave={(priceId, config) => {
						onCommitmentChange?.(priceId, config);
					}}
					currentConfig={overriddenPrices[selectedCommitmentPrice.id]?.commitment}
				/>
			)}

			{/* Line Item Coupon Modal - Only show if price is not overridden */}
			{couponModalState.priceId && !overriddenPrices[couponModalState.priceId] && (
				<LineItemCoupon
					priceId={couponModalState.priceId}
					currency={currency}
					selectedCoupon={lineItemCoupons[couponModalState.priceId]}
					onChange={(priceId, coupon) => {
						onLineItemCouponsChange?.(priceId, coupon);
						setCouponModalState({ isOpen: false, priceId: null });
					}}
					disabled={disabled}
					showAddButton={true}
					isModalOpen={couponModalState.isOpen}
					onModalClose={() => setCouponModalState({ isOpen: false, priceId: null })}
					allLineItemCoupons={lineItemCoupons}
					subscriptionLevelCoupons={subscriptionLevelCoupon ? [subscriptionLevelCoupon] : []}
				/>
			)}
		</div>
	);
};

export default PriceTable;
