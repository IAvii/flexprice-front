import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui';
import React from 'react';
import SidebarNav, { NavItem } from './SidebarMenu';
import FlexpriceSidebarFooter from './SidebarFooter';
import { RouteNames } from '@/core/routes/Routes';
import { EnvironmentSelector } from '@/components/molecules';
import { Settings, Landmark, Layers2, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

const AppSidebar: React.FC<React.ComponentProps<typeof Sidebar>> = ({ ...props }) => {
	const { open: sidebarOpen } = useSidebar();
	const navMain: NavItem[] = [
		{
			title: 'Product Catalog',
			url: '#',
			icon: Layers2,
			items: [
				{
					title: 'Features',
					url: RouteNames.features,
				},
				{
					title: 'Plans',
					url: RouteNames.plan,
				},
				{
					title: 'Pricing Widget',
					url: RouteNames.pricing,
				},
				{
					title: 'Coupons',
					url: RouteNames.coupons,
				},
				{
					title: 'Addons',
					url: RouteNames.addons,
				},
				{
					title: 'Cost Sheets',
					url: RouteNames.costSheets,
				},
				{
					title: 'Groups',
					url: RouteNames.groups,
				},
			],
		},
		{
			title: 'Billing',
			url: '#',
			icon: Landmark,
			items: [
				{
					title: 'Customers',
					url: RouteNames.customers,
				},
				{
					title: 'Subscriptions',
					url: RouteNames.subscriptions,
				},
				{
					title: 'Taxes',
					url: RouteNames.taxes,
				},
				{
					title: 'Invoices',
					url: RouteNames.invoices,
				},
				{
					title: 'Credit Notes',
					url: RouteNames.creditNotes,
				},
				{
					title: 'Payments',
					url: RouteNames.payments,
				},
				// {
				// 	title: 'Analytics',
				// 	url: RouteNames.analytics,
				// },
			],
		},
		{
			title: 'Usage Tracking',
			url: '#',
			icon: Gauge,
			items: [
				{
					title: 'Events Debugger',
					url: RouteNames.events,
				},
				{
					title: 'Query',
					url: RouteNames.queryPage,
				},
			],
		},
		{
			title: 'Tools',
			url: '#',
			icon: Settings,
			items: [
				{
					title: 'Integrations',
					url: RouteNames.integrations,
				},
				{
					title: 'Bulk Imports',
					url: RouteNames.bulkImports,
				},
				{
					title: 'Exports',
					url: RouteNames.exports,
				},
			],
		},
	];

	return (
		<Sidebar
			collapsible='icon'
			{...props}
			className={cn('border-none px-3 py-1 shadow-md  bg-[#f9f9f9]', sidebarOpen ? 'px-3' : 'pr-0 pl-2')}>
			<SidebarHeader>
				<EnvironmentSelector />
			</SidebarHeader>
			<SidebarContent className='gap-0 mt-4'>
				<SidebarNav items={navMain} />
			</SidebarContent>
			<SidebarFooter>
				<FlexpriceSidebarFooter />
			</SidebarFooter>
		</Sidebar>
	);
};

export default AppSidebar;
