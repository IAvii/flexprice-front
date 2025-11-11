import { FC, useState } from 'react';
import { Page, AddButton, Loader, Spacer } from '@/components/atoms';
import { ApiDocsContent } from '@/components/molecules/ApiDocs';
import { useQuery } from '@tanstack/react-query';
import { GroupApi } from '@/api/GroupApi';
import usePagination from '@/hooks/usePagination';
import GroupsTable from '@/components/molecules/GroupsTable';
import GroupDrawer from '@/components/molecules/GroupDrawer';
import { Group } from '@/models/Group';
import { ListGroupsResponse } from '@/types/dto';
import ShortPagination from '@/components/atoms/ShortPagination';
import EmptyPage from '@/components/organisms/EmptyPage';
import GUIDES from '@/constants/guides';
import toast from 'react-hot-toast';

const GroupsPage: FC = () => {
	const { limit, offset } = usePagination();
	const [activeGroup, setActiveGroup] = useState<Group | null>(null);
	const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);

	const {
		data: groupsData,
		isLoading,
		isError,
		error,
	} = useQuery<ListGroupsResponse>({
		queryKey: ['fetchGroups', { limit, offset }],
		queryFn: () => GroupApi.getGroupsByFilter({ limit, offset }),
	});

	const handleOnAdd = () => {
		setActiveGroup(null);
		setGroupDrawerOpen(true);
	};

	if (isError) {
		const err = error as any;
		toast.error(err?.error?.message || 'Error fetching groups');
		return null;
	}

	if (isLoading) {
		return <Loader />;
	}

	const showEmptyPage = !isLoading && groupsData?.items.length === 0;

	if (showEmptyPage) {
		return (
			<div className='space-y-6'>
				<GroupDrawer data={activeGroup} open={groupDrawerOpen} onOpenChange={setGroupDrawerOpen} refetchQueryKeys={['fetchGroups']} />
				<EmptyPage
					onAddClick={handleOnAdd}
					emptyStateCard={{
						heading: 'Set Up Your First Group',
						description: 'Create a group to organize your pricing entities.',
						buttonLabel: 'Create Group',
						buttonAction: handleOnAdd,
					}}
					tutorials={GUIDES.plans.tutorials}
					heading='Groups'
					tags={['Groups']}
				/>
			</div>
		);
	}

	return (
		<Page heading='Groups' headingCTA={<AddButton onClick={handleOnAdd} />}>
			<GroupDrawer data={activeGroup} open={groupDrawerOpen} onOpenChange={setGroupDrawerOpen} refetchQueryKeys={['fetchGroups']} />
			<ApiDocsContent tags={['Groups']} />
			<div className='space-y-6'>
				{isLoading ? (
					<div className='flex justify-center items-center min-h-[200px]'>
						<Loader />
					</div>
				) : (
					<>
						<GroupsTable
							data={groupsData?.items || []}
							onEdit={(group: Group) => {
								setActiveGroup(group);
								setGroupDrawerOpen(true);
							}}
						/>
						<Spacer className='!h-4' />
						<ShortPagination unit='Groups' totalItems={groupsData?.pagination.total ?? 0} />
					</>
				)}
			</div>
		</Page>
	);
};

export default GroupsPage;
