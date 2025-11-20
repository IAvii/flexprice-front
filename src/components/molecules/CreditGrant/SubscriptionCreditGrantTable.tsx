import React, { useState } from 'react';
import { AddButton, FormHeader, ActionButton } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '../Table';
import CreditGrantModal from './CreditGrantModal';
import { formatBillingPeriodForPrice } from '@/utils/common/helper_functions';
import { formatExpirationPeriod } from '@/utils/common/credit_grant_helpers';
import { InternalCreditGrantRequest } from '@/types/dto/CreditGrant';
import { CreditGrant } from '@/models';

interface Props {
	data: InternalCreditGrantRequest[];
	onChange: (data: InternalCreditGrantRequest[]) => void;
	disabled?: boolean;
	getEmptyCreditGrant: () => InternalCreditGrantRequest;
}

const SubscriptionCreditGrantTable: React.FC<Props> = ({ data, onChange, disabled, getEmptyCreditGrant }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedCreditGrant, setSelectedCreditGrant] = useState<InternalCreditGrantRequest | null>(null);

	const handleSave = (newCreditGrant: InternalCreditGrantRequest) => {
		if (selectedCreditGrant) {
			// Edit existing credit - preserve the id
			onChange(data.map((credit) => (credit.id === selectedCreditGrant.id ? { ...newCreditGrant, id: selectedCreditGrant.id } : credit)));
		} else {
			// Add new credit - id should already be set by getEmptyCreditGrant
			onChange([...data, newCreditGrant]);
		}
		setSelectedCreditGrant(null);
	};

	const handleDelete = async (id: string) => {
		onChange(data.filter((grant) => grant.id !== id));
	};

	const handleEdit = (credit: InternalCreditGrantRequest) => {
		setSelectedCreditGrant(credit);
		setIsOpen(true);
	};

	// check if this plan already has a credit grant this us just a temp fix

	const columns: ColumnData<InternalCreditGrantRequest>[] = [
		{
			title: 'Name',
			fieldName: 'name',
		},
		{
			title: 'Credits',
			render: (row) => `${row.credits}`,
		},
		{
			title: 'Priority',
			render: (row) => row.priority?.toString() || '--',
		},
		{
			title: 'Cadence',
			render: (row) => {
				const cadence = row.cadence.toLowerCase().replace('_', ' ');
				return cadence.charAt(0).toUpperCase() + cadence.slice(1);
			},
		},
		{
			title: 'Period',
			render: (row) => (row.period ? `${row.period_count || 1} ${formatBillingPeriodForPrice(row.period)}` : '--'),
		},
		{
			title: 'Expiration',
			render: (row) => formatExpirationPeriod(row as CreditGrant),
		},
		{
			fieldVariant: 'interactive',
			hideOnEmpty: true,
			render: (row) => (
				<ActionButton
					archiveText='Delete'
					id={row.id}
					deleteMutationFn={() => handleDelete(row.id)}
					refetchQueryKey='credit_grants'
					entityName={row.name}
					isEditDisabled={disabled}
					isArchiveDisabled={disabled}
					onEdit={() => handleEdit(row)}
				/>
			),
		},
	];

	return (
		<>
			<CreditGrantModal
				getEmptyCreditGrant={getEmptyCreditGrant}
				data={selectedCreditGrant || undefined}
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				onSave={handleSave}
				onCancel={() => {
					setIsOpen(false);
					setSelectedCreditGrant(null);
				}}
			/>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<FormHeader className='mb-0' title='Credit Grants' variant='sub-header' />
					<AddButton
						onClick={() => {
							setSelectedCreditGrant(null);
							setIsOpen(true);
						}}
						disabled={disabled}
					/>
				</div>
				<div className='rounded-xl border border-gray-300'>
					<FlexpriceTable data={data} columns={columns} showEmptyRow />
				</div>
			</div>
		</>
	);
};

export default SubscriptionCreditGrantTable;
