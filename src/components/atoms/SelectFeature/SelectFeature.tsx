import { SelectOption, Select } from '@/components/atoms';
import { cn } from '@/lib/utils';
import Feature, { FEATURE_TYPE } from '@/models/Feature';
import FeatureApi from '@/api/FeatureApi';
import { useQuery } from '@tanstack/react-query';
import { Gauge, SquareCheckBig, Wrench } from 'lucide-react';
import { FC } from 'react';
import { ENTITY_STATUS } from '@/models/base';

const fetchFeatures = async () => {
	return await FeatureApi.listFeatures({
		status: ENTITY_STATUS.PUBLISHED,
		limit: 1000,
	});
};

interface Props {
	onChange: (value: Feature) => void;
	value?: string;
	error?: string;
	label?: string;
	placeholder?: string;
	description?: string;
	className?: string;
	disabledFeatures?: string[];
	featureTypes?: FEATURE_TYPE[];
}

export const getFeatureIcon = (featureType: string) => {
	const className = 'size-4 opacity-80 text-muted-foreground';
	if (featureType === FEATURE_TYPE.BOOLEAN) {
		return <SquareCheckBig className={className} />;
	} else if (featureType === FEATURE_TYPE.METERED) {
		return <Gauge className={className} />;
	} else if (featureType === FEATURE_TYPE.STATIC) {
		return <Wrench className={className} />;
	}
};

const SelectFeature: FC<Props> = ({
	onChange,
	value,
	error,
	label = 'Features',
	placeholder = 'Select feature',
	description,
	className,
	disabledFeatures,
	featureTypes = [FEATURE_TYPE.METERED, FEATURE_TYPE.BOOLEAN, FEATURE_TYPE.STATIC],
}) => {
	const {
		data: featuresData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['fetchFeatures1'],
		queryFn: fetchFeatures,
	});

	if (isLoading) {
		return <div></div>;
	}

	if (isError) {
		return <div>Error</div>;
	}

	if (!featuresData) {
		return <div>No Features found</div>;
	}

	const filteredFeatures = featuresData.items.filter((feature: Feature) => featureTypes.includes(feature.type));

	const options = filteredFeatures
		.map(
			(feature: Feature): SelectOption => ({
				value: feature.id,
				label: feature.name,
				suffixIcon: getFeatureIcon(feature.type),
				disabled: disabledFeatures?.includes(feature.id),
			}),
		)
		.sort((a, b) => {
			if (a.disabled && !b.disabled) return 1;
			if (!a.disabled && b.disabled) return -1;
			return 0;
		});

	return (
		<div className={cn('min-w-[200px]')}>
			<Select
				hideSelectedTick={true}
				className={className}
				error={error}
				value={value}
				noOptionsText='No features added yet'
				onChange={(e) => {
					const selectedFeature = filteredFeatures.find((feature) => feature.id === e);
					if (selectedFeature) {
						onChange(selectedFeature);
					}
				}}
				options={options}
				placeholder={placeholder}
				label={label}
				description={description}
			/>
		</div>
	);
};

export default SelectFeature;
