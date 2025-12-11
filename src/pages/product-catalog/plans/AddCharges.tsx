import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import EntityChargesPage, { ENTITY_TYPE } from '@/components/organisms/EntityChargesPage';
import { PlanApi } from '@/api';
import { Loader } from '@/components/atoms';

const AddChargesPage = () => {
	const { planId } = useParams<{ planId: string }>();

	const { data: planData, isLoading } = useQuery({
		queryKey: ['fetchPlan', planId],
		queryFn: async () => {
			return await PlanApi.getPlanById(planId!);
		},
		enabled: !!planId,
	});

	if (isLoading) {
		return <Loader />;
	}

	return <EntityChargesPage entityType={ENTITY_TYPE.PLAN} entityId={planId!} entityName={planData?.name} />;
};

export default AddChargesPage;
