'use client';

import * as React from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, ScrollArea, ScrollBar } from '@/components/ui';

interface Props {
	date?: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	title?: string;
}

export const DateTimePicker: React.FC<Props> = ({ date, setDate, disabled, placeholder, title }) => {
	const [isOpen, setIsOpen] = React.useState(false);

	const hours = Array.from({ length: 12 }, (_, i) => i + 1);

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			// If we have an existing date, preserve the time
			if (date) {
				const newDate = new Date(selectedDate);
				newDate.setHours(date.getHours());
				newDate.setMinutes(date.getMinutes());
				setDate(newDate);
			} else {
				setDate(selectedDate);
			}
		}
	};

	const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', value: string) => {
		if (date) {
			const newDate = new Date(date);
			if (type === 'hour') {
				const hour = parseInt(value, 10);
				const isPM = newDate.getHours() >= 12;
				newDate.setHours(isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour);
			} else if (type === 'minute') {
				newDate.setMinutes(parseInt(value, 10));
			} else if (type === 'ampm') {
				const currentHours = newDate.getHours() % 12;
				newDate.setHours(value === 'PM' ? currentHours + 12 : currentHours);
			}
			setDate(newDate);
		}
	};

	return (
		<div className='space-y-1'>
			{title && <div className='text-sm font-medium text-zinc-950'>{title}</div>}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant='outline'
						className={cn(
							'w-full justify-start text-left font-normal h-10',
							date && 'border-primary-foreground',
							disabled && 'bg-gray-100',
							!date && 'text-muted-foreground',
						)}
						disabled={disabled}>
						<CalendarIcon className='mr-2 h-4 w-4' />
						{date ? format(date, 'MM/dd/yyyy hh:mm aa') : <span>{placeholder ? placeholder : 'MM/DD/YYYY hh:mm aa'}</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0'>
					<div className='sm:flex'>
						<Calendar mode='single' selected={date} onSelect={handleDateSelect} initialFocus />
						<div className='flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x'>
							<ScrollArea className='w-64 sm:w-auto'>
								<div className='flex sm:flex-col p-2'>
									{hours.reverse().map((hour) => (
										<Button
											key={hour}
											size='icon'
											variant={date && date.getHours() % 12 === hour % 12 ? 'default' : 'ghost'}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('hour', hour.toString())}>
											{hour}
										</Button>
									))}
								</div>
								<ScrollBar orientation='horizontal' className='sm:hidden' />
							</ScrollArea>
							<ScrollArea className='w-64 sm:w-auto'>
								<div className='flex sm:flex-col p-2'>
									{Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
										<Button
											key={minute}
											size='icon'
											variant={date && date.getMinutes() === minute ? 'default' : 'ghost'}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('minute', minute.toString())}>
											{minute}
										</Button>
									))}
								</div>
								<ScrollBar orientation='horizontal' className='sm:hidden' />
							</ScrollArea>
							<ScrollArea>
								<div className='flex sm:flex-col p-2'>
									{['AM', 'PM'].map((ampm) => (
										<Button
											key={ampm}
											size='icon'
											variant={
												date && ((ampm === 'AM' && date.getHours() < 12) || (ampm === 'PM' && date.getHours() >= 12)) ? 'default' : 'ghost'
											}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('ampm', ampm)}>
											{ampm}
										</Button>
									))}
								</div>
							</ScrollArea>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};

export default DateTimePicker;
