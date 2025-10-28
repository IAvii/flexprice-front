import { Price } from '@/models/Price';
import { FC, useState, useEffect } from 'react';
import { Button, Input, Select, SelectOption, Spacer } from '@/components/atoms';
import SelectMeter from './SelectMeter';
// import { Pencil, Trash2 } from 'lucide-react';
import { Meter } from '@/models/Meter';
import { formatBillingPeriodForPrice, getCurrencySymbol } from '@/utils/common/helper_functions';
import { billlingPeriodOptions, currencyOptions } from '@/constants/constants';
import VolumeTieredPricingForm from './VolumeTieredPricingForm';
import { InternalPrice } from './SetupChargesSection';
import UsageChargePreview from './UsageChargePreview';
import { toast } from 'react-hot-toast';
import { BILLING_CADENCE, INVOICE_CADENCE } from '@/models/Invoice';
import { BILLING_MODEL, TIER_MODE, PRICE_ENTITY_TYPE } from '@/models/Price';
import { BILLING_PERIOD, PRICE_TYPE } from '@/models/Price';
interface Props {
	onAdd: (price: InternalPrice) => void;
	onUpdate: (price: InternalPrice) => void;
	onEditClicked: () => void;
	onDeleteClicked: () => void;
	price: Partial<InternalPrice>;
	entityType?: PRICE_ENTITY_TYPE;
	entityId?: string;
}

export interface PriceTier {
	from: number;
	up_to: number | null;
	flat_amount?: string;
	unit_amount?: string;
}

interface TieredPrice {
	from: number;
	up_to: number | null;
	unit_amount: string;
	flat_amount: string;
}

// TODO: Remove disabled once the feature is released
const billingModels: SelectOption[] = [
	{
		value: BILLING_MODEL.FLAT_FEE,
		label: 'Flat Fee',
		description: 'Charge a fixed amount for each unit of usage.',
	},
	{
		value: BILLING_MODEL.PACKAGE,
		label: 'Package',
		description: 'Charge by package, bundle or group of units.',
	},
	{
		value: BILLING_MODEL.TIERED,
		label: 'Volume Tiered',
		description: 'All units price based on final tier reached.',
	},
	{
		value: 'SLAB_TIERED',
		label: 'Slab Tiered',
		description: 'Tiers apply progressively as quantity increases.',
	}, // Maps to TIERED with SLAB tier_mode
];

const UsagePricingForm: FC<Props> = ({
	onAdd,
	onUpdate,
	onEditClicked,
	onDeleteClicked,
	price,
	entityType = PRICE_ENTITY_TYPE.PLAN,
	entityId,
}) => {
	const [currency, setCurrency] = useState(price.currency || currencyOptions[0].value);
	const [billingModel, setBillingModel] = useState(price.billing_model || billingModels[0].value);
	const [meterId, setMeterId] = useState<string>(price.meter_id || '');
	const [activeMeter, setActiveMeter] = useState<Meter | null>(price.meter || null);
	const [tieredPrices, setTieredPrices] = useState<PriceTier[]>([
		{ from: 0, up_to: 1, unit_amount: '', flat_amount: '0' },
		{ from: 1, up_to: null, unit_amount: '', flat_amount: '0' },
	]);
	const [billingPeriod, setBillingPeriod] = useState(price.billing_period || billlingPeriodOptions[1].value);
	const [flatFee, setFlatFee] = useState<string>(price.amount || '');
	const [packagedFee, setPackagedFee] = useState<{ unit: string; price: string }>({
		unit: '',
		price: '',
	});

	const [errors, setErrors] = useState<Partial<Record<keyof Price, any>>>({});
	const [inputErrors, setInputErrors] = useState({
		flatModelError: '',
		packagedModelError: '',
		tieredModelError: '',
	});


	// Load price data when editing
	useEffect(() => {
		if (price.internal_state === 'edit') {
			setCurrency(price.currency || currencyOptions[0].value);
			setBillingModel(price.billing_model || billingModels[0].value);
			setMeterId(price.meter_id || '');
			if (price.meter) {
				setActiveMeter({
					id: price.meter.id,
					name: price.meter.name,
				} as Meter);
			}
			setBillingPeriod(price.billing_period || billlingPeriodOptions[1].value);

			if (price.billing_model === 'FLAT_FEE') {
				setFlatFee(price.amount || '');
			} else if (price.billing_model === 'PACKAGE') {
				setPackagedFee({
					price: price.amount || '',
					unit: (price.transform_quantity as any)?.divide_by?.toString() || '',
				});
			} else if (price.billing_model === 'TIERED' && Array.isArray(price.tiers)) {
				setTieredPrices(
					(price.tiers as unknown as TieredPrice[]).map((tier) => ({
						from: tier.from,
						up_to: tier.up_to,
						unit_amount: tier.unit_amount,
						flat_amount: tier.flat_amount,
					})),
				);

				// Set the appropriate billing model based on tier_mode
				if (price.tier_mode === TIER_MODE.SLAB) {
					setBillingModel(billingModels[3].value); // SLAB_TIERED
				} else {
					setBillingModel(billingModels[2].value); // Volume Tiered (default)
				}
			}
		}
	}, [price]);
	const validate = () => {
		setErrors({});
		setInputErrors({
			flatModelError: '',
			packagedModelError: '',
			tieredModelError: '',
		});

		if (!meterId) {
			setErrors((prev) => ({ ...prev, meter_id: 'Feature is required' }));
			return false;
		}

		// Tiered pricing validation
		if (billingModel === billingModels[2].value || billingModel === billingModels[3].value) {
			// Check if tiers are provided
			if (tieredPrices.length === 0) {
				setInputErrors((prev) => ({
					...prev,
					tieredModelError: 'Tiers are required when billing model is TIERED',
				}));
				toast.error('Tiers are required when billing model is TIERED');
				return false;
			}

			// Validate each tier
			for (let i = 0; i < tieredPrices.length; i++) {
				const tier = tieredPrices[i];

				// Validate unit amount is provided and valid
				if (!tier.unit_amount || tier.unit_amount.trim() === '') {
					setInputErrors((prev) => ({
						...prev,
						tieredModelError: `Unit amount is required for tier ${i + 1}`,
					}));
					toast.error(`Unit amount is required for tier ${i + 1}`);
					return false;
				}

				// Validate unit amount is a valid decimal and greater than or equal to 0
				const unitAmount = parseFloat(tier.unit_amount);
				if (isNaN(unitAmount) || unitAmount < 0) {
					setInputErrors((prev) => ({
						...prev,
						tieredModelError: `Unit amount must be greater than or equal to 0 for tier ${i + 1}`,
					}));
					toast.error(`Unit amount must be greater than or equal to 0 for tier ${i + 1}`);
					return false;
				}

				// Validate flat amount if provided
				if (tier.flat_amount && tier.flat_amount.trim() !== '') {
					const flatAmount = parseFloat(tier.flat_amount);
					if (isNaN(flatAmount) || flatAmount < 0) {
						setInputErrors((prev) => ({
							...prev,
							tieredModelError: `Flat amount must be greater than or equal to 0 for tier ${i + 1}`,
						}));
						toast.error(`Flat amount must be greater than or equal to 0 for tier ${i + 1}`);
						return false;
					}
				}

				// Validate tier ranges
				if (tier.up_to !== null) {
					if (tier.from > tier.up_to) {
						setInputErrors((prev) => ({
							...prev,
							tieredModelError: `From value cannot be greater than up to in tier ${i + 1}`,
						}));
						toast.error(`From value cannot be greater than up to in tier ${i + 1}`);
						return false;
					}
				}
			}
		}

		// Package pricing validation
		if (billingModel === billingModels[1].value) {
			if (packagedFee.price === '' || packagedFee.unit === '') {
				setInputErrors((prev) => ({ ...prev, packagedModelError: 'Invalid package fee' }));
				return false;
			}

			// Validate package price is a valid decimal
			const packagePrice = parseFloat(packagedFee.price);
			if (isNaN(packagePrice) || packagePrice < 0) {
				setInputErrors((prev) => ({ ...prev, packagedModelError: 'Package price must be a valid number greater than or equal to 0' }));
				return false;
			}

			// Validate package unit is a valid integer greater than 0
			const packageUnit = parseInt(packagedFee.unit);
			if (isNaN(packageUnit) || packageUnit <= 0) {
				setInputErrors((prev) => ({ ...prev, packagedModelError: 'Package unit must be a valid number greater than 0' }));
				return false;
			}
		}

		// Flat fee validation
		if (billingModel === billingModels[0].value) {
			if (!flatFee || flatFee.trim() === '') {
				setInputErrors((prev) => ({ ...prev, flatModelError: 'Flat fee is required' }));
				return false;
			}

			const flatFeeAmount = parseFloat(flatFee);
			if (isNaN(flatFeeAmount) || flatFeeAmount < 0) {
				setInputErrors((prev) => ({ ...prev, flatModelError: 'Flat fee must be a valid number greater than or equal to 0' }));
				return false;
			}
		}

		return true;
	};

	const handleCancel = () => {
		if (price.internal_state === 'edit') {
			onDeleteClicked();
		} else {
			onDeleteClicked();
		}
	};

	const handleSubmit = () => {
		if (!validate()) return;

		const basePrice: Partial<Price> = {
			meter_id: meterId,
			meter: activeMeter || undefined,
			currency,
			billing_period: billingPeriod,
			billing_model: billingModel as BILLING_MODEL,
			type: PRICE_TYPE.USAGE,
			billing_period_count: 1,
			billing_cadence: 'RECURRING' as BILLING_CADENCE,
			invoice_cadence: INVOICE_CADENCE.ARREAR,
			entity_type: entityType,
			entity_id: entityId || '',
		};

		let finalPrice: Partial<Price>;

		if (billingModel === billingModels[0].value) {
			finalPrice = {
				...basePrice,
				amount: flatFee,
			};
		} else if (billingModel === billingModels[1].value) {
			finalPrice = {
				...basePrice,
				amount: packagedFee.price,
				transform_quantity: {
					divide_by: Number(packagedFee.unit),
				},
			};
		} else if (billingModel === billingModels[2].value || billingModel === billingModels[3].value) {
			finalPrice = {
				...basePrice,
				billing_model: BILLING_MODEL.TIERED,
				tiers: tieredPrices.map((tier) => ({
					from: tier.from,
					up_to: tier.up_to ?? null,
					unit_amount: tier.unit_amount || '0',
					flat_amount: tier.flat_amount || '0',
				})) as unknown as NonNullable<Price['tiers']>,
				tier_mode: billingModel === billingModels[2].value ? TIER_MODE.VOLUME : TIER_MODE.SLAB,
			};
		} else {
			// Default case - should not happen with current billing models
			finalPrice = basePrice;
		}
		// If we're editing an existing price, preserve its ID and other important fields
		if (price.internal_state === 'edit') {
			const finalPriceWithEdit: InternalPrice = {
				...price,
				...finalPrice,
				type: PRICE_TYPE.USAGE,
				meter_id: meterId,
				meter: activeMeter || price.meter,
				internal_state: 'saved',
			};
			onUpdate(finalPriceWithEdit);
		} else {
			onAdd({
				...finalPrice,
				internal_state: 'saved',
			} as InternalPrice);
		}
	};

	if (price.internal_state === 'saved') {
		return (
			<div className='mb-2 space-y-2'>
				<UsageChargePreview charge={price} index={0} onEdit={onEditClicked} onDelete={onDeleteClicked} />
			</div>
		);
	}

	return (
		<div className='card mb-2'>
			<Spacer height={'8px'} />
			<SelectMeter
				error={errors.meter_id}
				onChange={(meter) => {
					if (meter) {
						setMeterId(meter.id);
						setActiveMeter(meter);
					}
				}}
				value={meterId}
			/>
			<Spacer height='8px' />
			<Select
				value={currency}
				options={currencyOptions}
				label='Currency'
				onChange={setCurrency}
				placeholder='Currency'
				error={errors.currency}
			/>
			<Spacer height='8px' />
			<Select
				value={billingPeriod}
				options={billlingPeriodOptions}
				onChange={(value) => {
					setBillingPeriod(value as BILLING_PERIOD);
				}}
				label='Billing Period'
				placeholder='Select The Billing Period'
				error={errors.billing_period}
			/>
			<Spacer height={'8px'} />

			<Select
				value={billingModel}
				options={billingModels}
				onChange={setBillingModel}
				label='Billing Model'
				error={errors.billing_model}
				placeholder='Billing Model'
			/>
			<Spacer height='8px' />

			{billingModel === billingModels[0].value && (
				<div className='space-y-2'>
					<Input
						placeholder='0.00'
						variant='formatted-number'
						error={inputErrors.flatModelError}
						label='Price'
						value={flatFee}
						inputPrefix={getCurrencySymbol(currency)}
						onChange={(e) => {
							// Validate decimal input
							const decimalRegex = /^\d*\.?\d*$/;
							if (decimalRegex.test(e) || e === '') {
								setFlatFee(e);
							}
						}}
						suffix={<span className='text-[#64748B]'>{`/ unit / ${formatBillingPeriodForPrice(billingPeriod)}`}</span>}
					/>
				</div>
			)}

			{billingModel === billingModels[1].value && (
				<div className='space-y-1'>
					<div className='flex w-full gap-2 items-end'>
						<Input
							variant='formatted-number'
							label='Price'
							placeholder='0.00'
							value={packagedFee.price}
							inputPrefix={getCurrencySymbol(currency)}
							onChange={(e) => {
								// Validate decimal input
								const decimalRegex = /^\d*\.?\d*$/;
								if (decimalRegex.test(e) || e === '') {
									setPackagedFee({ ...packagedFee, price: e });
								}
							}}
						/>
						<div className='h-[50px] items-center flex gap-2'>
							<p className='text-[#18181B] font-medium'>per</p>
						</div>
						<Input
							value={packagedFee.unit}
							variant='integer'
							placeholder='0'
							onChange={(e) => {
								// Validate integer input
								const integerRegex = /^\d*$/;
								if (integerRegex.test(e) || e === '') {
									setPackagedFee({
										...packagedFee,
										unit: e,
									});
								}
							}}
							suffix={`/ units / ${formatBillingPeriodForPrice(billingPeriod)}`}
						/>
					</div>
					{inputErrors.packagedModelError && <p className='text-red-500 text-sm'>{inputErrors.packagedModelError}</p>}
				</div>
			)}

			{(billingModel === billingModels[2].value || billingModel === billingModels[3].value) && (
				<div className='space-y-2'>
					<Spacer height='8px' />
					<VolumeTieredPricingForm
						setTieredPrices={setTieredPrices}
						tieredPrices={tieredPrices}
						currency={currency}
						tierMode={billingModel === billingModels[2].value ? TIER_MODE.VOLUME : TIER_MODE.SLAB}
					/>
					{inputErrors.tieredModelError && <p className='text-red-500 text-sm'>{inputErrors.tieredModelError}</p>}
				</div>
			)}

			{/* <Spacer height='12px' /> */}
			{/* <CheckboxRadioGroup
				title='Billing timing'
				value={invoiceCadence}
				checkboxItems={[
					{
						label: 'Advance',
						value: 'ADVANCE',
						description: 'Charge at the start of each billing cycle.',
						disabled: true,
					},
					{
						label: 'Arrear',
						value: 'ARREAR',
						description: 'Charge at the end of the billing cycle.',
					},
				]}
				onChange={(value) => {
					setInvoiceCadence(value);
				}}
				error={inputErrors.invoiceCadenceError}
			/> */}
			<Spacer height={'16px'} />
			<Spacer height='16px' />
			<div className='flex justify-end'>
				<Button onClick={handleCancel} variant='secondary' className='mr-4 text-zinc-900'>
					{price.internal_state === 'edit' ? 'Delete' : 'Cancel'}
				</Button>
				<Button onClick={handleSubmit} variant='default' className='mr-4 font-normal'>
					{price.internal_state === 'edit' ? 'Update' : 'Add'}
				</Button>
			</div>
		</div>
	);
};

export default UsagePricingForm;
