import { useState, useEffect } from 'react';
import { formatBillingPeriodForPrice, getCurrencySymbol } from '@/utils/common/helper_functions';
import { billlingPeriodOptions, currencyOptions } from '@/constants/constants';
import { InternalPrice } from './SetupChargesSection';
import { PriceInternalState } from './UsagePricingForm';
import { CheckboxRadioGroup, FormHeader, Input, Spacer, Button, Select, DatePicker } from '@/components/atoms';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import RecurringChargePreview from './RecurringChargePreview';
import { BILLING_CADENCE, INVOICE_CADENCE } from '@/models/Invoice';
import { BILLING_PERIOD, PRICE_ENTITY_TYPE } from '@/models/Price';
import SelectGroup from './SelectGroup';
import { Group } from '@/models/Group';

interface Props {
	price: Partial<InternalPrice>;
	onAdd: (price: Partial<InternalPrice>) => void;
	onUpdate: (price: Partial<InternalPrice>) => void;
	onEditClicked: () => void;
	onDeleteClicked: () => void;
	entityType?: PRICE_ENTITY_TYPE;
	entityId?: string;
	entityName?: string;
}

const RecurringChargesForm = ({
	price,
	onAdd,
	onUpdate,
	onEditClicked,
	onDeleteClicked,
	entityType = PRICE_ENTITY_TYPE.PLAN,
	entityId,
	entityName,
}: Props) => {
	const [localPrice, setLocalPrice] = useState<Partial<InternalPrice>>({
		...price,
		display_name: price.display_name || entityName || '',
	});
	const [startDate, setStartDate] = useState<Date | undefined>(price.start_date ? new Date(price.start_date) : undefined);
	const [errors, setErrors] = useState<Partial<Record<keyof InternalPrice, string>>>({});

	// Update startDate when price changes (e.g., when editing)
	useEffect(() => {
		if (price.start_date) {
			setStartDate(new Date(price.start_date));
		} else {
			setStartDate(undefined);
		}
	}, [price.start_date]);

	// Update display_name when entityName becomes available or when price.display_name changes
	useEffect(() => {
		setLocalPrice((prev) => {
			// If price has an explicit display_name, use it
			if (price.display_name !== undefined && price.display_name !== null && price.display_name !== '') {
				return { ...prev, display_name: price.display_name };
			}
			// Otherwise, if entityName is available and display_name is empty/not set, use entityName
			if (entityName && (!prev.display_name || prev.display_name === '')) {
				return { ...prev, display_name: entityName };
			}
			return prev;
		});
	}, [price.display_name, entityName]);

	const validate = () => {
		const newErrors: Partial<Record<keyof InternalPrice, string>> = {};

		if (!localPrice.amount) {
			newErrors.amount = 'Price is required';
		}
		if (!localPrice.billing_period) {
			newErrors.billing_period = 'Billing Period is required';
		}
		if (!localPrice.currency) {
			newErrors.currency = 'Currency is required';
		}

		if (!localPrice.invoice_cadence) {
			newErrors.invoice_cadence = 'Invoice Cadence is required';
		}

		if (localPrice.isTrialPeriod && !localPrice.trial_period) {
			newErrors.trial_period = 'Trial Period is required';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = () => {
		if (!validate()) return;

		const priceWithEntity = {
			...localPrice,
			entity_type: entityType,
			entity_id: entityId || '',
			start_date: startDate ? startDate.toISOString() : undefined,
		};

		if (price.internal_state === PriceInternalState.EDIT) {
			onUpdate({
				...priceWithEntity,
				isEdit: false,
			});
		} else {
			onAdd({
				...priceWithEntity,
				isEdit: false,
			});
		}
	};

	const handleGroupChange = (group: Group | null) => {
		setLocalPrice({ ...localPrice, group_id: group?.id || undefined });
	};

	if (price.internal_state === PriceInternalState.SAVED) {
		return <RecurringChargePreview charge={price} onEditClicked={onEditClicked} onDeleteClicked={onDeleteClicked} />;
	}

	return (
		<div className='card'>
			<Input
				onChange={(value) => setLocalPrice({ ...localPrice, display_name: value })}
				value={localPrice.display_name || ''}
				variant='text'
				label='Display Name'
				placeholder={entityName || 'Enter display name'}
				error={errors.display_name}
			/>
			<Spacer height={'8px'} />
			<Select
				value={localPrice.currency}
				options={currencyOptions}
				label='Currency'
				onChange={(value) => setLocalPrice({ ...localPrice, currency: value })}
				error={errors.currency}
			/>
			<Spacer height={'8px'} />
			<Select
				value={localPrice.billing_period}
				options={billlingPeriodOptions}
				onChange={(value) => setLocalPrice({ ...localPrice, billing_period: value as BILLING_PERIOD })}
				label='Billing Period'
				error={errors.billing_period}
			/>
			<Spacer height={'8px'} />
			<Input
				onChange={(value) => setLocalPrice({ ...localPrice, amount: value })}
				value={localPrice.amount}
				variant='formatted-number'
				label='Price'
				placeholder='0'
				error={errors.amount}
				inputPrefix={getCurrencySymbol(localPrice.currency || '')}
				suffix={<span className='text-[#64748B]'> {`per ${formatBillingPeriodForPrice(localPrice.billing_period || '')}`}</span>}
			/>
			<Spacer height={'8px'} />
			<SelectGroup
				value={localPrice.group_id}
				onChange={handleGroupChange}
				label='Group'
				placeholder='Select a group (optional)'
				description='Assign this price to a group for better organization'
				hiddenIfEmpty
			/>
			<Spacer height={'16px'} />
			<DatePicker
				popoverTriggerClassName='w-full'
				className='w-full'
				popoverClassName='w-full'
				popoverContentClassName='w-full'
				date={startDate}
				setDate={setStartDate}
				label='Start Date (Optional)'
				placeholder='Select start date'
				minDate={new Date()}
			/>
			<Spacer height={'16px'} />
			<FormHeader title='Billing Timing' variant='form-component-title' />
			{/* starting billing preffercences */}

			<CheckboxRadioGroup
				title='	'
				value={localPrice.invoice_cadence}
				checkboxItems={[
					{
						label: 'Advance',
						value: INVOICE_CADENCE.ADVANCE,
						description: 'Charge at the start of each billing cycle.',
					},
					{
						label: 'Arrear',
						value: INVOICE_CADENCE.ARREAR,
						description: 'Charge at the end of the billing cycle.',
					},
				]}
				onChange={(value) => {
					setLocalPrice({ ...localPrice, invoice_cadence: value as INVOICE_CADENCE });
					if (value === BILLING_CADENCE.ONETIME) {
						setLocalPrice({ ...localPrice, isTrialPeriod: false, trial_period: 0 });
					}
				}}
				error={errors.invoice_cadence}
			/>
			<Spacer height={'16px'} />
			<div>
				<FormHeader title='Trial Period' variant='form-component-title' />
				<div className='flex items-center space-x-4 s'>
					<Switch
						id='airplane-mode'
						checked={localPrice.isTrialPeriod}
						onCheckedChange={(value) => {
							setLocalPrice({ ...localPrice, isTrialPeriod: value });
						}}
					/>
					<Label htmlFor='airplane-mode'>
						<p className='font-medium text-sm text-[#18181B] peer-checked:text-black'>Start with a free trial</p>
						<Spacer height={'4px'} />
						<p className='text-sm font-normal text-[#71717A] peer-checked:text-gray-700'>
							Enable this option to add a free trial period for the subscription.
						</p>
					</Label>
				</div>
			</div>
			{localPrice.isTrialPeriod && (
				<div>
					<Spacer height={'8px'} />
					<Input
						variant='number'
						error={errors.trial_period}
						value={localPrice.trial_period}
						onChange={(value) => {
							setLocalPrice({ ...localPrice, trial_period: Number(value) });
						}}
						suffix='days'
						placeholder='Number of trial days'
					/>
				</div>
			)}
			<Spacer height={'16px'} />
			<div className='flex justify-end'>
				<Button onClick={onDeleteClicked} variant='secondary' className='mr-4 text-zinc-900'>
					{price.internal_state === PriceInternalState.EDIT ? 'Delete' : 'Cancel'}
				</Button>
				<Button onClick={handleSubmit} variant='default' className='mr-4 font-normal'>
					{price.internal_state === PriceInternalState.EDIT ? 'Update' : 'Add'}
				</Button>
			</div>
		</div>
	);
};

export default RecurringChargesForm;
