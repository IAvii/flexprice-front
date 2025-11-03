import MainLayout from '@/layouts/MainLayout';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthMiddleware from '../auth/AuthProvider';
import { useUser } from '@/hooks/UserContext';
import { TenantMetadataKey } from '@/models/Tenant';
import {
	// Auth pages
	Auth,
	SignupConfirmation,
	ResendVerification,
	EmailVerification,
	// Customer pages
	CustomerListPage as CustomerPage,
	Subscriptions as SubscriptionsPage,
	CreateCustomerSubscriptionPage,
	CustomerProfilePage,
	InvoicePage,
	InvoiceDetailsPage,
	CustomerInvoiceTab as Invoice,
	CustomerOverviewTab as Overview,
	CustomerAnalyticsTab as AnalyticsTab,
	CustomerWalletTab as WalletTab,
	CustomerSubscriptionDetailsPage,
	CustomerSubscriptionEditPage,
	AddCreditNotePage as AddCreditPage,
	CreditNote,
	CreditNotesPage,
	CreditNoteDetailsPage,
	ImportExport,
	CustomerInvoiceDetailsPage,
	CustomerInformationTab as CustomerInformation,
	PaymentPage,
	CreateInvoice as CreateInvoicePage,
	TaxRatesPage as TaxPage,
	CustomerTaxAssociationTab as TaxAssociation,
	TaxrateDetailsPage,
	// Product catalog pages
	Plans as PricingPlans,
	PlanDetailsPage,
	AddFeature as AddFeaturePage,
	Features as FeaturesPage,
	FeatureDetails,
	Addons as AddonsPage,
	AddonDetails as AddonDetailsPage,
	AddonCharges as AddonChargesPage,
	CostSheets as CostSheetsPage,
	CostSheetDetails as CostSheetDetailsPage,
	CostSheetCharges as CostSheetChargesPage,
	Pricing as PricingPage,
	AddCharges as AddChargesPage,
	Coupons as CouponsPage,
	CouponDetails,
	Groups as GroupsPage,
	// Usage pages
	Events as EventsPage,
	Query as QueryPage,
	// Developer pages
	DeveloperPage,
	// Onboarding pages
	OnboardingTenant,
	// Webhooks pages
	WebhookDashboard,
	// Settings pages
	Billing as BillingPage,
	// Insights tools pages
	Integrations,
	IntegrationDetails,
	Exports,
	S3Exports,
	ExportManagement,
	ExportDetails,
	TaskRunsPage,
	// Error pages
	ErrorPage,
} from '@/pages';
import { RouterErrorElement } from '@/components/atoms/ErrorBoundary';

export const RouteNames = {
	home: '/',
	login: '/login',
	auth: '/auth',
	signupConfirmation: '/auth/signup/confirmation',
	resendVerification: '/auth/resend-verification',
	verifyEmail: '/auth/verify-email',

	// usage tracking routes
	usageTracking: '/usage-tracking',
	meter: '/usage-tracking/meter',
	addMeter: '/usage-tracking/meter/add-meter',
	editMeter: '/usage-tracking/meter/edit-meter',
	events: '/usage-tracking/events',
	queryPage: '/usage-tracking/query',

	// billing routes
	customerManagement: '/billing',
	customers: '/billing/customers',
	subscriptions: '/billing/subscriptions',
	createSubscription: '/billing/subscriptions/create',
	subscriptionDetails: '/billing/subscriptions/:id',
	taxes: '/billing/taxes',
	invoices: '/billing/invoices',
	createInvoice: '/billing/customers/:customerId/invoices/create',
	creditNotes: '/billing/credit-notes',
	payments: '/billing/payments',
	analytics: '/billing/analytics',

	// product catalog routes
	productCatalog: '/product-catalog',
	plan: '/product-catalog/plan',
	pricing: '/product-catalog/pricing-widget',
	addCharges: '/product-catalog/plan/:planId/add-charges',

	features: '/product-catalog/features',
	createFeature: '/product-catalog/features/create-feature',
	featureDetails: '/product-catalog/features',

	// coupon routes
	coupons: '/product-catalog/coupons',
	couponDetails: '/product-catalog/coupons',

	// add on routes
	addons: '/product-catalog/addons',
	addonDetails: '/product-catalog/addons',
	addonCharges: '/product-catalog/addons/:addonId/add-charges',

	// cost sheet routes
	costSheets: '/product-catalog/cost-sheets',
	costSheetDetails: '/product-catalog/cost-sheets',
	costSheetCharges: '/product-catalog/cost-sheets/:costSheetId/add-charges',

	// group routes
	groups: '/product-catalog/groups',

	// tools routes
	tools: '/tools',
	bulkImports: '/tools/bulk-imports',
	integrations: '/tools/integrations',
	integrationDetails: '/tools/integrations',
	exports: '/tools/exports',
	s3Exports: '/tools/exports/s3',
	s3ExportManagement: '/tools/exports/s3/:connectionId/export',
	s3ExportDetails: '/tools/exports/s3/:connectionId/export/:exportId',
	s3TaskRuns: '/tools/exports/s3/:connectionId/export/:exportId/runs',

	// footer
	developers: '/developers',
	onboarding: '/onboarding',
	billing: '/billing',
	webhooks: '/webhooks',
};

const DefaultRoute = () => {
	const { user } = useUser();
	const onboardingMetadata = user?.tenant?.metadata?.[TenantMetadataKey.ONBOARDING_COMPLETED];
	const onboardingCompleted = onboardingMetadata === 'true';
	return <Navigate to={onboardingCompleted ? RouteNames.pricing : RouteNames.onboarding} />;
};

export const MainRouter = createBrowserRouter([
	// public routes
	{
		path: RouteNames.login,
		element: <Auth />,
	},
	{
		path: RouteNames.auth,
		element: <Auth />,
	},
	{
		path: RouteNames.signupConfirmation,
		element: <SignupConfirmation />,
	},
	{
		path: RouteNames.resendVerification,
		element: <ResendVerification />,
	},
	{
		path: RouteNames.verifyEmail,
		element: <EmailVerification />,
	},
	// private routes
	{
		path: RouteNames.home,
		element: (
			<AuthMiddleware requiredRole={['admin']}>
				<MainLayout />
			</AuthMiddleware>
		),
		errorElement: <RouterErrorElement />,
		children: [
			{
				path: RouteNames.home,
				element: <DefaultRoute />,
			},

			{
				path: RouteNames.productCatalog,
				children: [
					{
						path: RouteNames.plan,
						element: <PricingPlans />,
					},
					{
						path: RouteNames.pricing,
						element: <PricingPage />,
					},
					{
						path: `${RouteNames.plan}/:planId`,
						element: <PlanDetailsPage />,
					},
					{
						path: RouteNames.features,
						element: <FeaturesPage />,
					},
					{
						path: RouteNames.createFeature,
						element: <AddFeaturePage />,
					},
					{
						path: `${RouteNames.featureDetails}/:id`,
						element: <FeatureDetails />,
					},
					{
						path: RouteNames.addons,
						element: <AddonsPage />,
					},
					{
						path: `${RouteNames.addonDetails}/:id`,
						element: <AddonDetailsPage />,
					},
					{
						path: RouteNames.addonCharges,
						element: <AddonChargesPage />,
					},
					{
						path: RouteNames.costSheets,
						element: <CostSheetsPage />,
					},
					{
						path: `${RouteNames.costSheetDetails}/:id`,
						element: <CostSheetDetailsPage />,
					},
					{
						path: RouteNames.costSheetCharges,
						element: <CostSheetChargesPage />,
					},
					{
						path: RouteNames.addCharges,
						element: <AddChargesPage />,
					},
					{
						path: RouteNames.coupons,
						element: <CouponsPage />,
					},
					{
						path: `${RouteNames.couponDetails}/:id`,
						element: <CouponDetails />,
					},
					{
						path: RouteNames.groups,
						element: <GroupsPage />,
					},
				],
			},

			{
				path: RouteNames.tools,
				children: [
					{
						path: RouteNames.bulkImports,
						element: <ImportExport />,
					},
					{
						path: RouteNames.integrations,
						element: <Integrations />,
					},
					{
						path: `${RouteNames.integrationDetails}/:id`,
						element: <IntegrationDetails />,
					},
					{
						path: RouteNames.exports,
						element: <Exports />,
					},
					{
						path: RouteNames.s3Exports,
						element: <S3Exports />,
					},
					{
						path: RouteNames.s3ExportManagement,
						element: <ExportManagement />,
					},
					{
						path: RouteNames.s3ExportDetails,
						element: <ExportDetails />,
					},
					{
						path: RouteNames.s3TaskRuns,
						element: <TaskRunsPage />,
					},
				],
			},
			{
				path: RouteNames.customerManagement,
				children: [
					{
						path: RouteNames.customers,
						element: <CustomerPage />,
					},
					{
						path: RouteNames.subscriptions,
						element: <SubscriptionsPage />,
					},
					{
						path: `${RouteNames.subscriptions}/:id/edit`,
						element: <CustomerSubscriptionEditPage />,
					},
					{
						path: `${RouteNames.customers}/:id/add-subscription`,
						element: <CreateCustomerSubscriptionPage />,
					},
					{
						path: RouteNames.payments,
						element: <PaymentPage />,
					},
					// {
					// 	path: RouteNames.analytics,
					// 	element: <CostAnalyticsPage />,
					// },
					{
						path: `${RouteNames.customers}/:id`,
						element: <CustomerProfilePage />,
						children: [
							{
								path: '',
								element: <Overview />,
								index: true,
							},
							{
								path: 'overview',
								element: <Overview />,
								index: true,
							},
							{
								path: 'information',
								element: <CustomerInformation />,
							},
							{
								path: 'wallet',
								element: <WalletTab />,
							},
							{
								path: 'credit-note',
								element: <CreditNote />,
							},
							{
								path: 'invoice',
								element: <Invoice />,
							},
							{
								path: 'tax-association',
								element: <TaxAssociation />,
							},
							{
								path: 'analytics',
								element: <AnalyticsTab />,
							},

							{
								path: 'invoice/:invoice_id',
								element: <CustomerInvoiceDetailsPage />,
							},
							{
								path: 'invoice/:invoice_id/credit-note',
								element: <AddCreditPage />,
							},
							{
								path: 'subscription/:subscription_id',
								element: <CustomerSubscriptionDetailsPage />,
							},
							{
								path: 'subscription/:subscription_id/edit',
								element: <CustomerSubscriptionEditPage />,
							},
						],
					},
					{
						path: `${RouteNames.customers}/:customerId/invoices/create`,
						element: <CreateInvoicePage />,
					},
					{
						path: RouteNames.invoices,
						element: <InvoicePage />,
					},
					{
						path: RouteNames.taxes,
						element: <TaxPage />,
					},
					{
						path: `${RouteNames.taxes}/:taxrateId`,
						element: <TaxrateDetailsPage />,
					},
					{
						path: `${RouteNames.invoices}/:invoiceId`,
						element: <InvoiceDetailsPage />,
					},
					{
						path: RouteNames.creditNotes,
						element: <CreditNotesPage />,
					},
					{
						path: `${RouteNames.creditNotes}/:credit_note_id`,
						element: <CreditNoteDetailsPage />,
					},
				],
			},
			{
				path: RouteNames.usageTracking,
				children: [
					{
						path: RouteNames.events,
						element: <EventsPage />,
					},
					{
						path: RouteNames.queryPage,
						element: <QueryPage />,
					},
				],
			},

			{
				path: RouteNames.developers,
				element: <DeveloperPage />,
			},
			{
				path: RouteNames.webhooks,
				element: <WebhookDashboard />,
			},
			{
				path: RouteNames.onboarding,
				element: <OnboardingTenant />,
			},
			{
				path: RouteNames.billing,
				element: <BillingPage />,
			},
		],
	},
	{
		path: '*',
		element: <ErrorPage />,
		errorElement: <RouterErrorElement />,
	},
]);
