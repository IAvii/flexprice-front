'use client';

import { Loader } from '@/components/atoms';
import { Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SubscriptionsByPlan {
	count: number;
	plan_name: string;
	plan_id: string;
}

interface RecentSubscriptionsCardProps {
	subscriptionsCount: number;
	subscriptionsByPlan: SubscriptionsByPlan[];
	isLoading: boolean;
}

export const RecentSubscriptionsCard: React.FC<RecentSubscriptionsCardProps> = ({ subscriptionsCount, subscriptionsByPlan, isLoading }) => {
	return (
		<div className='bg-white border border-[#E5E7EB] rounded-md shadow-sm overflow-hidden'>
			<div className='p-6 border-b border-[#E5E7EB]'>
				<div className='flex items-center justify-between mb-2'>
					<h3 className='text-base font-medium text-[#111827]'>Recent Subscriptions</h3>
					<Users className='w-5 h-5 text-blue-600' />
				</div>
				<p className='text-xs text-[#6B7280]'>Created in last 24 hours</p>
			</div>
			<div className='p-6'>
				{isLoading ? (
					<div className='flex items-center justify-center py-8'>
						<Loader />
					</div>
				) : (
					<>
						<div className='text-center mb-4'>
							<p className='text-4xl font-medium text-[#111827]'>{subscriptionsCount}</p>
							<p className='text-sm text-[#6B7280] mt-1'>New subscriptions</p>
						</div>
						{subscriptionsByPlan.length > 0 ? (
							<div className='mt-4'>
								<ResponsiveContainer width='100%' height={180}>
									<PieChart>
										<Pie
											data={subscriptionsByPlan.map((item) => ({
												name: item.plan_name.length > 20 ? item.plan_name.substring(0, 20) + '...' : item.plan_name,
												value: item.count,
												fullName: item.plan_name,
											}))}
											cx='50%'
											cy='50%'
											innerRadius={40}
											outerRadius={70}
											paddingAngle={2}
											dataKey='value'>
											{subscriptionsByPlan.map((_, idx) => (
												<Cell key={`cell-${idx}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6]} />
											))}
										</Pie>
										<Tooltip
											contentStyle={{
												backgroundColor: 'white',
												border: '1px solid #e5e7eb',
												borderRadius: '8px',
												padding: '8px 12px',
											}}
											formatter={(value: any, _name: any, props: any) => [
												`${value} subscription${value !== 1 ? 's' : ''}`,
												props.payload.fullName,
											]}
										/>
										<Legend
											verticalAlign='bottom'
											height={36}
											iconType='circle'
											formatter={(value) => <span className='text-xs text-[#6B7280]'>{value}</span>}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>
						) : (
							<p className='text-center text-sm text-[#9CA3AF] py-4'>No subscriptions created in the last 24 hours</p>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default RecentSubscriptionsCard;
