import { useEffect, useState } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/utils/common/helper_functions';
import { startOfMonth } from 'date-fns';

interface Props {
	startDate?: Date;
	endDate?: Date;
	placeholder?: string;
	disabled?: boolean;
	title?: string;
	minDate?: Date;
	maxDate?: Date;
	onChange: (dates: { startDate?: Date; endDate?: Date }) => void;
	className?: string;
	labelClassName?: string;
	popoverClassName?: string;
	popoverTriggerClassName?: string;
	popoverContentClassName?: string;
}

const DateRangePicker = ({
	startDate,
	endDate,
	onChange,
	placeholder = 'Select Range',
	disabled,
	title,
	minDate,
	maxDate,
	className,
	labelClassName,
	popoverClassName,
	popoverTriggerClassName,
	popoverContentClassName,
}: Props) => {
	const [open, setOpen] = useState(false);
	const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

	const currentMonth = startOfMonth(new Date());

	const handleSelect = (date: { from?: Date; to?: Date } | undefined) => {
		if (!date) return;
		if (date.from && date.to) {
			setSelectedRange({
				from: date.from,
				to: date.to,
			});
		}
		onChange({ startDate: date.from, endDate: date.to });
	};

	useEffect(() => {
		if (startDate && endDate) {
			setSelectedRange({ from: startDate, to: endDate });
		} else {
			setSelectedRange(undefined);
		}
	}, [startDate, endDate]);

	// useEffect(() => {
	// 	if (open) {
	// 		setSelectedRange(undefined);
	// 	}
	// }, [open]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className={popoverTriggerClassName} disabled={disabled}>
				<div className='flex flex-col '>
					{title && <div className={cn('text-sm font-medium mb-1 w-full text-start', labelClassName)}>{title}</div>}
					<div className='relative'>
						<Button
							variant='outline'
							className={cn(
								' justify-start text-left font-normal !h-10',
								!selectedRange?.from || !selectedRange?.to ? 'text-muted-foreground opacity-70 hover:text-muted-foreground' : 'text-black',
								!className && (selectedRange?.from && selectedRange?.to ? 'w-[260px]' : 'w-[240px]'),
								'transition-all duration-300 ease-in-out',
								className,
							)}>
							<CalendarIcon className='mr-0 h-4 w-4' />
							<span>
								{selectedRange?.from && selectedRange?.to
									? `${formatDateShort(selectedRange?.from.toISOString())} - ${formatDateShort(selectedRange?.to.toISOString())}`
									: placeholder}
							</span>
						</Button>
						{selectedRange?.from && selectedRange?.to && (
							<X
								className='ml-2 h-4 w-4 absolute right-2 top-[12px] cursor-pointer'
								onClick={(e) => {
									e.stopPropagation();
									setSelectedRange(undefined);
									onChange({ startDate: undefined, endDate: undefined });
								}}
							/>
						)}
					</div>
				</div>
			</PopoverTrigger>

			<PopoverContent className={cn('w-auto flex gap-4 p-2', popoverClassName, popoverContentClassName)} align='start'>
				<Calendar
					disabled={disabled}
					mode='range'
					selected={selectedRange}
					onSelect={handleSelect}
					fromDate={minDate}
					toDate={maxDate}
					defaultMonth={currentMonth}
					numberOfMonths={2}
				/>
			</PopoverContent>
		</Popover>
	);
};

export default DateRangePicker;
