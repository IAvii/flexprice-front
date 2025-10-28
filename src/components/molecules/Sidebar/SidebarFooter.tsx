import { BookOpen, ExternalLink, ChevronsUpDown, CodeXml, LogOut, ListChecks, CreditCard, Webhook } from 'lucide-react';
import { RouteNames } from '@/core/routes/Routes';
import { SidebarMenuButton, useSidebar, Popover, PopoverContent, PopoverTrigger, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

import { useLocation, useNavigate } from 'react-router-dom';
import AuthService from '@/core/auth/AuthService';
import useUser from '@/hooks/useUser';

const SidebarFooter = () => {
	const navigate = useNavigate();
	const handleLogout = async () => {
		await AuthService.logout();
	};

	const { loading, user } = useUser();
	const { open: sidebarOpen } = useSidebar();
	const location = useLocation();

	const isActive = (path: string) => {
		return location.pathname.includes(path);
	};

	if (loading) return <Skeleton className='w-full h-10' />;

	const dropdownItems = [
		{
			label: 'Onboarding',
			icon: ListChecks,
			onClick: () => {
				navigate(RouteNames.onboarding);
			},
		},
		{
			label: 'Billing',
			icon: CreditCard,
			onClick: () => {
				navigate(RouteNames.billing);
			},
		},
		{
			label: 'Logout',
			icon: LogOut,
			onClick: handleLogout,
		},
	];

	return (
		<div className='flex flex-col gap-2 w-full'>
			<SidebarMenuButton
				onClick={() => {
					navigate(RouteNames.developers);
				}}
				tooltip={'Developers'}
				className={cn(
					`flex items-center justify-between gap-2 hover:bg-muted transition-colors my-0 py-1 `,
					isActive(RouteNames.developers) && 'bg-muted',
				)}>
				<span className='flex items-center gap-2'>
					<CodeXml className={cn('size-5 mr-1 !stroke-[1.5px]', isActive(RouteNames.developers) ? 'text-[#3C87D2]' : 'text-[#3F3F46]')} />
					<span className='text-sm select-none'>{'Developers'}</span>
				</span>
				<div></div>
			</SidebarMenuButton>

			<SidebarMenuButton
				onClick={() => {
					navigate(RouteNames.webhooks);
				}}
				tooltip={'Webhooks'}
				className={cn(
					`flex items-center justify-between gap-2 hover:bg-muted transition-colors my-0 py-1 `,
					isActive(RouteNames.webhooks) && 'bg-muted',
				)}>
				<span className='flex items-center gap-2'>
					<Webhook className={cn('size-5 mr-1 !stroke-[1.5px]', isActive(RouteNames.webhooks) ? 'text-[#3C87D2]' : 'text-[#3F3F46]')} />
					<span className='text-sm select-none'>{'Webhooks'}</span>
				</span>
				<div></div>
			</SidebarMenuButton>

			<SidebarMenuButton
				onClick={() => {
					window.open('https://docs.flexprice.io', '_blank');
				}}
				tooltip={'Documentation'}
				className={cn(
					`flex items-center justify-between gap-2 hover:bg-muted transition-colors my-0 py-1 `,
					isActive(RouteNames.developers) && 'bg-muted',
				)}>
				<span className='flex items-center gap-2'>
					<BookOpen className={cn('size-5 mr-1 !stroke-[1.5px]')} />
					<span className='text-sm select-none'>{'Documentation'}</span>
				</span>
				<ExternalLink />
			</SidebarMenuButton>

			{/* user profile */}
			<Popover>
				<PopoverTrigger asChild>
					<button className='w-full flex items-center justify-between h-10 rounded-md gap-2 px-2 hover:bg-muted transition-colors'>
						<div className='flex items-center gap-1 min-w-0 flex-1'>
							<div className='size-5 text-xs   bg-primary text-primary-foreground flex justify-center items-center rounded-full flex-shrink-0 font-medium'>
								{user?.email ? user.email.charAt(0).toUpperCase() : 'F'}
							</div>
							<div className={cn('min-w-0 flex-1 text-left', sidebarOpen ? '' : 'hidden')}>
								<p className='text-xs text-muted-foreground truncate'>{user?.email}</p>
							</div>
						</div>
						<ChevronsUpDown className={cn('h-4 w-4 text-muted-foreground', sidebarOpen ? '' : 'hidden')} />
					</button>
				</PopoverTrigger>
				<PopoverContent className='!w-56 mx-auto p-2 space-y-1'>
					{dropdownItems.map((item, index) => {
						return (
							<button
								key={index}
								onClick={item.onClick}
								className='w-full flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted transition-colors'>
								{item.icon && <item.icon className='size-4' />}
								<span className='text-sm'>{item.label}</span>
							</button>
						);
					})}
				</PopoverContent>
			</Popover>
		</div>
	);
};

export default SidebarFooter;
