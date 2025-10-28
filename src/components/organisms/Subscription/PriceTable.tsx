import { FC, useState, useMemo } from 'react';
import { ColumnData, FlexpriceTable, LineItemCoupon } from '@/components/molecules';
import PriceOverrideDialog from '@/components/molecules/PriceOverrideDialog/PriceOverrideDialog';
import { Price, PRICE_TYPE } from '@/models';
import { ChevronDownIcon, ChevronUpIcon, Pencil, RotateCcw, Tag } from 'lucide-react';
import { FormHeader } from '@/components/atoms';
import { motion } from 'framer-motion';
import { ChargeValueCell } from '@/components/molecules';
import { capitalize } from 'es-toolkit';
import { Coupon } from '@/models';
import { BsThreeDots } from 'react-icons/bs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { ExtendedPriceOverride } from '@/utils';

export interface Props {
	data: Price[];
	billingPeriod?: string;
	currency?: string;
	onPriceOverride?: (priceId: string, override: Partial<ExtendedPriceOverride>) => void;
	onResetOverride?: (priceId: string) => void;
	overriddenPrices?: Record<string, ExtendedPriceOverride>;
	lineItemCoupons?: Record<string, Coupon>;
	onLineItemCouponsChange?: (priceId: string, coupon: Coupon | null) => void;
	disabled?: boolean;
	subscriptionLevelCoupon?: Coupon | null; // For tracking subscription level coupon
}

type ChargeTableData = {
	charge: JSX.Element;
	quantity: string;
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
	disabled = false,
	subscriptionLevelCoupon = null,
}) => {
	const [showAllRows, setShowAllRows] = useState(false);
	const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [couponModalState, setCouponModalState] = useState<{ isOpen: boolean; priceId: string | null }>({
		isOpen: false,
		priceId: null,
	});

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

	// Custom action component for price rows
	const PriceActionMenu: FC<{ price: Price }> = ({ price }) => {
		const [isDropdownOpen, setIsDropdownOpen] = useState(false);
		// Now all billing models are overridable with the new comprehensive dialog
		const isOverridden = overriddenPrices[price.id] !== undefined;

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
					<div>{price.meter?.name ? `${price.meter.name}` : price.description || 'Charge'}</div>
				</div>
			),
			quantity: (() => {
				if (price.type === PRICE_TYPE.FIXED) return '1';

				// const override = overriddenPrices[price.id];

				// // PRIORITY 1: Check for any package overrides first (including transform_quantity)
				// if (override?.billing_model === BILLING_MODEL.PACKAGE) {
				// 	if (override?.quantity) {
				// 		return override.quantity.toString();
				// 	}
				// 	if (override?.transform_quantity) {
				// 		return `${override.transform_quantity.divide_by} units`;
				// 	}
				// }

				// // PRIORITY 2: Check for transform_quantity overrides even when billing model hasn't changed
				// if (override?.transform_quantity && price.billing_model === BILLING_MODEL.PACKAGE) {
				// 	return `${override.transform_quantity.divide_by} units`;
				// }

				// // PRIORITY 3: Show original package transform_quantity if no overrides
				// if (price.billing_model === BILLING_MODEL.PACKAGE && price.transform_quantity) {
				// 	return `${price.transform_quantity.divide_by} units`;
				// }

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
		<div>
			<div>
				<FormHeader title='Charges' variant='sub-header' />
			</div>
			<div className='rounded-xl border border-gray-300 space-y-6 mt-2 '>
				<motion.div
					initial={{ height: 'auto' }}
					// animate={{ height: showAllRows ? 'auto' : 200 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					style={{ overflow: 'hidden' }}>
					<FlexpriceTable columns={columns} data={displayedData} />
				</motion.div>
			</div>
			{mappedData.length > 5 && (
				<div className='text-center mt-4 w-full flex justify-center'>
					<span className='flex items-center gap-1 text-xs duration-300 transition-all' onClick={() => setShowAllRows((prev) => !prev)}>
						{showAllRows ? (
							<>
								<ChevronUpIcon className='w-4 h-4' />
							</>
						) : (
							<>
								<ChevronDownIcon className='w-4 h-4' />
							</>
						)}
					</span>
				</div>
			)}

			{/* Comprehensive Price Override Dialog */}
			{selectedPrice && (
				<PriceOverrideDialog
					isOpen={isDialogOpen}
					onOpenChange={setIsDialogOpen}
					price={selectedPrice}
					onPriceOverride={onPriceOverride || (() => {})}
					onResetOverride={onResetOverride || (() => {})}
					overriddenPrices={overriddenPrices}
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
