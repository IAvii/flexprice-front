'use client';

import { Loader } from '@/components/atoms';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { getTypographyClass } from '@/lib/typography';

interface RevenueMonth {
	month: string;
	revenue: number;
	currency: string;
}

interface RevenueTrendCardProps {
	revenueData: RevenueMonth[];
	isLoading: boolean;
	className?: string;
}

export const RevenueTrendCard: React.FC<RevenueTrendCardProps> = ({ revenueData, isLoading, className }) => {
	return (
		<Card className={`shadow-sm ${className || ''}`}>
			<CardHeader className='pb-2'>
				<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
					<div>
						<CardTitle className={getTypographyClass('section-title', 'font-medium')}>Revenue Trend</CardTitle>
						<CardDescription className={getTypographyClass('helper-text', 'mt-1')}>Last 3 months</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className='pt-0 pb-5'>
				{isLoading ? (
					<div className='flex items-center justify-center py-4 px-6'>
						<Loader />
					</div>
				) : revenueData && revenueData.length > 0 ? (
					<div>
						{revenueData.map((month, index) => {
							const isLast = index === revenueData.length - 1;
							return (
								<div
									key={index}
									className={`flex items-center justify-between px-6 ${isLast ? 'pt-3 pb-0' : 'py-3 border-b border-zinc-100'}`}>
									<div className='flex-1'>
										<p className={getTypographyClass('body-default', 'font-medium text-zinc-900')}>{month.month}</p>
									</div>
									<div className='text-right'>
										<p className={`text-lg font-semibold ${month.revenue === 0 ? 'text-zinc-400' : 'text-zinc-900'}`}>
											{month.revenue === 0
												? '--'
												: new Intl.NumberFormat('en-US', {
														style: 'currency',
														currency: month.currency,
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													}).format(month.revenue)}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<p className={getTypographyClass('body-small', 'text-center text-zinc-500 py-6 px-6')}>No revenue data available</p>
				)}
			</CardContent>
		</Card>
	);
};

export default RevenueTrendCard;
