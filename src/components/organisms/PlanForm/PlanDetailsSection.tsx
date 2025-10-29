import { Input, Spacer, Textarea } from '@/components/atoms';
import { Plan } from '@/models/Plan';
import { useState } from 'react';

interface Props {
	plan: Partial<Plan>;
	setPlanField: <K extends keyof Plan>(field: K, value: Plan[K]) => void;
	errors: Partial<Record<keyof Plan, string>>;
}

const PlanDetailsSection = ({ plan, setPlanField, errors }: Props) => {
	// Track if user manually edited the lookup key to stop auto-generation
	const [isLookupKeyManuallyEdited, setIsLookupKeyManuallyEdited] = useState(false);

	return (
		<div className='p-6  rounded-xl border border-[#E4E4E7]'>
			<Input
				placeholder='Enter a name for the plan'
				description={'A descriptive name for this pricing plan.'}
				label='Plan Name'
				value={plan.name}
				error={errors.name}
				onChange={(e) => {
					setPlanField('name', e);
					// Auto-generate lookup key from plan name, but only if user hasn't manually edited it
					if (!isLookupKeyManuallyEdited) {
						setPlanField('lookup_key', 'plan-' + e.replace(/\s/g, '-').toLowerCase());
					}
				}}
			/>

			<Spacer height={'20px'} />
			<Input
				label='Lookup Key'
				error={errors.lookup_key}
				onChange={(e) => {
					setPlanField('lookup_key', e);
					// Mark that user manually edited the lookup key, stop auto-generation
					setIsLookupKeyManuallyEdited(true);
				}}
				value={plan.lookup_key}
				placeholder='Enter a slug for the plan'
				description={'A system identifier used for API calls and integrations.'}
			/>
			<Spacer height={'20px'} />
			<Textarea
				value={plan.description}
				onChange={(e) => setPlanField('description', e)}
				className='min-h-[100px]'
				placeholder='Enter description'
				label='Description'
				description='Helps your team to understand the purpose of this plan.'
			/>
		</div>
	);
};

export default PlanDetailsSection;
