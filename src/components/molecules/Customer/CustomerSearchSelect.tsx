import React from 'react';
import AsyncSearchableSelect, { AsyncSearchableSelectProps } from '@/components/atoms/Select/AsyncSearchableSelect';
import CustomerApi from '@/api/CustomerApi';
import { Customer } from '@/models';

export interface CustomerSearchSelectProps extends Omit<AsyncSearchableSelectProps<Customer>, 'search' | 'extractors'> {
	/** Maximum number of results to fetch (default: 20) */
	limit?: number;
	/** Search input placeholder */
	searchPlaceholder?: string;
}

/**
 * CustomerSearchSelect - A convenience wrapper around AsyncSearchableSelect
 * pre-configured for searching customers by name and email.
 */
const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
	limit = 20,
	searchPlaceholder = 'Search for customer...',
	...props
}) => {
	const searchFn = async (query: string) => {
		const response = await CustomerApi.searchCustomers(query, limit);
		return response.items.map((customer) => ({
			value: customer.id,
			label: customer.name,
			data: customer, // Include full customer object
		}));
	};

	return (
		<AsyncSearchableSelect<Customer>
			{...props}
			search={{
				searchFn,
				placeholder: searchPlaceholder,
			}}
			extractors={{
				valueExtractor: (customer) => customer.id,
				labelExtractor: (customer) => customer.name,
			}}
		/>
	);
};

export default CustomerSearchSelect;
