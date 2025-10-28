import React from 'react';
import { Testimonial } from '@/types';
import Card from '../../atoms/Card/Card';
import { getTypographyClass } from '@/lib/typography';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
	testimonial: Testimonial;
	logoHeightClass?: string;
}

const DUMMY_DP = 'https://randomuser.me/api/portraits/men/32.jpg'; // dummy image for dp

const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial, logoHeightClass }) => {
	return (
		<Card
			className={cn(
				'bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border w-[300px] border-gray-200 flex flex-col gap-4 p-6',
				'transition-shadow hover:shadow-xl',
			)}>
			<div className='flex items-center gap-2 mb-1'>
				<img
					src={testimonial.companyTitleLogoUrl || testimonial.logoUrl}
					alt={testimonial.companyName + ' logo'}
					className={cn(logoHeightClass ? logoHeightClass + ' w-auto ' : 'max-h-8 w-auto', 'object-contain')}
				/>
			</div>
			<div className={cn('text-black mb-6', 'font-normal', 'text-[13px]', 'leading-relaxed', 'font-[400]')}>{testimonial.testimonial}</div>
			<div className='flex items-center gap-3 mt-auto '>
				<img
					src={testimonial.dpUrl || DUMMY_DP}
					alt={testimonial.name}
					className='size-9 rounded-full object-cover border border-gray-200 bg-zinc-100'
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).src = DUMMY_DP;
					}}
				/>
				<div>
					<div className={getTypographyClass('card-header', 'leading-tight font-normal text-[14px]')}>{testimonial.name}</div>
					<div className={cn('text-[13px] text-zinc-500 leading-tight font-[400]')}>{testimonial.designation}</div>
				</div>
			</div>
		</Card>
	);
};

export default TestimonialCard;
