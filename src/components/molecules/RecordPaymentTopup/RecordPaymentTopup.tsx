import { Button, Input, Select, Textarea, PaymentUrlSuccessDialog, DatePicker } from '@/components/atoms';
import { FC, useState, useEffect } from 'react';
import { getCurrencySymbol } from '@/utils/common/helper_functions';
import { PAYMENT_METHOD_TYPE, PAYMENT_DESTINATION_TYPE, Payment } from '@/models/Payment';
import PaymentApi from '@/api/PaymentApi';
import WalletApi from '@/api/WalletApi';
import ConnectionApi from '@/api/ConnectionApi';
import { RecordPaymentPayload } from '@/types/dto/Payment';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LoaderCircleIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { ServerError } from '@/core/axios/types';
import { CONNECTION_PROVIDER_TYPE } from '@/models/Connection';

interface Props {
	isOpen: boolean;
	onOpenChange: (value: boolean) => void;
	destination_id: string;
	destination_type: PAYMENT_DESTINATION_TYPE;
	customer_id: string;
	max_amount?: number;
	currency: string;
	onSuccess?: (payment: Payment) => void;
}

interface ValidationErrors {
	amount?: string;
	payment_method_type?: string;
	reference_id?: string;
	description?: string;
	wallet_id?: string;
	selected_connection_id?: string;
	recorded_at?: string;
	general?: string;
}

interface PaymentFormData {
	amount: number;
	payment_method_type: PAYMENT_METHOD_TYPE | '';
	// Reference/Payment Method ID (required for OFFLINE, CARD, ACH)
	reference_id?: string;
	// Optional description for all payment types
	description?: string;
	// Wallet fields (optional for CREDITS - backend will auto-select if not provided)
	wallet_id?: string;
	// Connection fields (for provider-based payments)
	selected_connection_id?: string;
	// Recorded at date (for offline payments)
	recorded_at?: Date;
}

const RecordPaymentTopup: FC<Props> = ({
	isOpen,
	onOpenChange,
	destination_id,
	destination_type,
	customer_id,
	max_amount,
	currency,
	onSuccess,
}) => {
	const [formData, setFormData] = useState<PaymentFormData>({
		amount: max_amount || 0,
		payment_method_type: '',
	});
	const [errors, setErrors] = useState<ValidationErrors>({});
	const [paymentUrlPopup, setPaymentUrlPopup] = useState<{
		isOpen: boolean;
		paymentUrl: string;
		isCopied: boolean;
	}>({
		isOpen: false,
		paymentUrl: '',
		isCopied: false,
	});

	// Fetch customer wallets when CREDITS payment method is selected
	const { data: wallets } = useQuery({
		queryKey: ['customerWallets', customer_id],
		queryFn: () => WalletApi.getCustomerWallets({ id: customer_id }),
		enabled: !!customer_id && formData.payment_method_type === PAYMENT_METHOD_TYPE.CREDITS,
	});

	// Fetch available connections to determine available payment methods
	const { data: connectionsResponse } = useQuery({
		queryKey: ['connections', 'published'],
		queryFn: () => ConnectionApi.getPublishedConnections(),
		enabled: isOpen, // Only fetch when the dialog is open
	});

	const availableConnections = connectionsResponse?.connections || [];

	// Filter wallets by currency and create options
	const filteredWallets = wallets?.filter((wallet) => wallet.currency === currency) || [];

	const walletOptions = filteredWallets.map((wallet) => ({
		label: `${wallet.name || 'Unnamed Wallet'} (${getCurrencySymbol(wallet.currency)}${wallet.balance || 0})`,
		value: wallet.id,
	}));

	// Create select options - only include auto-select if there are multiple wallets
	const selectOptions =
		filteredWallets.length > 1 ? [{ label: 'From all wallets', value: '__auto_select__' }, ...walletOptions] : walletOptions;

	useEffect(() => {
		if (formData.payment_method_type === PAYMENT_METHOD_TYPE.CREDITS && filteredWallets.length === 1) {
			// Auto-set single wallet without showing auto-select option
			setFormData((prev) => ({ ...prev, wallet_id: filteredWallets[0].id }));
		}
	}, [filteredWallets, formData.payment_method_type]);

	// Generate payment method options based on available connections
	const paymentMethodOptions = [
		{
			label: 'Offline',
			value: PAYMENT_METHOD_TYPE.OFFLINE,
			description: 'Record payment that was processed outside the system',
		},
		{
			label: 'Credits',
			value: PAYMENT_METHOD_TYPE.CREDITS,
			description: 'Pay using customer wallet balance',
		},
		// Add Payment Link if connections are available
		...(availableConnections.length > 0
			? [
					{
						label: 'Payment Link',
						value: PAYMENT_METHOD_TYPE.PAYMENT_LINK,
						description: 'Generate a payment link for online payment',
					},
				]
			: []),
	];

	// Generate provider options for Payment Link
	const providerOptions = availableConnections
		.map((connection) => {
			switch (connection.provider_type) {
				case CONNECTION_PROVIDER_TYPE.STRIPE:
					return {
						label: 'Stripe',
						value: connection.id,
						description: `Process payment through Stripe (${connection.name})`,
					};
				// Add more provider types as needed
				default:
					return null;
			}
		})
		.filter((option): option is { label: string; value: string; description: string } => option !== null);

	// Reset form when drawer opens/closes
	useEffect(() => {
		if (!isOpen) {
			setFormData({
				amount: max_amount || 0,
				payment_method_type: '',
				reference_id: '',
				description: '',
				wallet_id: '',
				selected_connection_id: '',
				recorded_at: undefined,
			});
			setErrors({});
		}
	}, [isOpen, max_amount]);

	const validateForm = (): boolean => {
		const newErrors: ValidationErrors = {};

		// Validate amount
		if (!formData.amount || formData.amount <= 0) {
			newErrors.amount = 'Amount is required and must be greater than 0';
		} else if (max_amount && formData.amount > max_amount) {
			newErrors.amount = `Amount cannot exceed ${getCurrencySymbol(currency)}${max_amount}`;
		}

		// Validate payment method type
		if (!formData.payment_method_type) {
			newErrors.payment_method_type = 'Payment method is required';
		}

		// Validate provider selection for Payment Links
		if (formData.payment_method_type === PAYMENT_METHOD_TYPE.PAYMENT_LINK && !formData.selected_connection_id) {
			newErrors.selected_connection_id = 'Payment provider is required';
		}

		// Validate payment method specific fields
		switch (formData.payment_method_type) {
			case PAYMENT_METHOD_TYPE.OFFLINE:
				// Validate recorded_at for offline payments only if user sets it
				if (formData.recorded_at && formData.recorded_at > new Date()) {
					newErrors.recorded_at = 'Recorded date cannot be in the future';
				}
				// if (!formData.reference_id?.trim()) {
				// newErrors.reference_id = 'Reference ID is required for offline payments';
				// }
				// No need to validate reference_id for offline payments
				break;

			case PAYMENT_METHOD_TYPE.CARD:
			case PAYMENT_METHOD_TYPE.ACH:
				// These methods are disabled, but validate just in case
				newErrors.payment_method_type = 'This payment method is not available yet';
				break;

			case PAYMENT_METHOD_TYPE.CREDITS:
				// Wallet selection is optional - backend will auto-select if not provided
				// But if no wallets are available, show error
				if (filteredWallets.length === 0) {
					newErrors.wallet_id = `No ${currency} wallets available. Please create a wallet first.`;
				}
				break;

			case PAYMENT_METHOD_TYPE.PAYMENT_LINK:
				// No additional validation needed for Payment Link
				break;
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const { mutate: recordPayment, isPending } = useMutation({
		mutationFn: async (): Promise<Payment> => {
			// Find the selected connection for connection-based payments
			const selectedConnection = formData.selected_connection_id
				? availableConnections.find((conn) => conn.id === formData.selected_connection_id)
				: null;

			// Check if this is a payment link (when a connection is selected, it becomes a payment link)
			const isPaymentLink = !!selectedConnection;

			// Generate success and cancel URLs for payment links
			const generatePaymentUrls = (): Record<string, string> => {
				if (!isPaymentLink) return {};

				const baseUrl = window.location.origin;
				const currentUrl = window.location.href;

				// Extract the current page URL (for invoices it would be something like:
				// /billing/invoices/inv_123?page=1)
				let redirectUrl = currentUrl;

				// If destination_type is INVOICE, construct the invoice page URL
				if (destination_type === PAYMENT_DESTINATION_TYPE.INVOICE) {
					const urlParams = new URLSearchParams(window.location.search);
					const pageParam = urlParams.get('page') || '1';
					redirectUrl = `${baseUrl}/billing/invoices/${destination_id}?page=${pageParam}`;
				}

				return {
					success_url: redirectUrl,
					cancel_url: redirectUrl,
				};
			};

			const paymentUrls = generatePaymentUrls();

			const payload: RecordPaymentPayload = {
				amount: formData.amount,
				currency,
				destination_id,
				destination_type,
				payment_method_type: formData.payment_method_type as PAYMENT_METHOD_TYPE,
				process_payment: true,
				...(formData.payment_method_type === PAYMENT_METHOD_TYPE.CREDITS && {
					payment_method_id: formData.wallet_id || '',
				}),
				// Add recorded_at for offline payments
				...(formData.payment_method_type === PAYMENT_METHOD_TYPE.OFFLINE &&
					formData.recorded_at && {
						recorded_at: formData.recorded_at,
					}),
				// Add payment_gateway for connection-based payments
				...(selectedConnection && {
					payment_gateway: selectedConnection.provider_type,
					payment_method_type: PAYMENT_METHOD_TYPE.PAYMENT_LINK,
				}),
				idempotency_key: formData.reference_id,
				metadata: {
					// Add description if provided
					...(formData.description?.trim() && {
						description: formData.description.trim(),
					}),
					// For OFFLINE, store reference_id in metadata instead of payment_method_id
					...(formData.payment_method_type === PAYMENT_METHOD_TYPE.OFFLINE && {
						reference_id: formData.reference_id,
					}),
					// For CREDITS, add wallet_id to metadata if provided (for tracking)
					...(formData.payment_method_type === PAYMENT_METHOD_TYPE.CREDITS &&
						formData.wallet_id && {
							wallet_id: formData.wallet_id,
						}),
					// For connection-based payments, add connection info
					...(selectedConnection && {
						connection_id: selectedConnection.id,
						connection_name: selectedConnection.name,
					}),
					// For payment links, add success and cancel URLs
					...paymentUrls,
				},
			};

			return await PaymentApi.createPayment(payload);
		},
		onSuccess: (payment: Payment) => {
			toast.success('Payment recorded successfully');

			// If payment has a URL (for payment links), show the popup and close main dialog
			if (payment.payment_url) {
				onOpenChange(false); // Close main dialog first
				setPaymentUrlPopup({
					isOpen: true,
					paymentUrl: payment.payment_url,
					isCopied: false,
				});
			} else {
				// For non-payment-link payments, close the dialog immediately
				onOpenChange(false);
			}

			onSuccess?.(payment);
		},
		onError: (error: ServerError) => {
			toast.error(error?.error?.message || 'Failed to record payment. Please try again.');
		},
	});

	const handleSubmit = () => {
		if (!validateForm()) {
			return;
		}
		recordPayment();
	};

	const handleCopyUrl = async () => {
		try {
			await navigator.clipboard.writeText(paymentUrlPopup.paymentUrl);
			setPaymentUrlPopup((prev) => ({ ...prev, isCopied: true }));
			toast.success('Payment URL copied to clipboard!');

			// Reset copy status after 2 seconds
			setTimeout(() => {
				setPaymentUrlPopup((prev) => ({ ...prev, isCopied: false }));
			}, 2000);
		} catch (error) {
			console.error('Failed to copy payment URL:', error);
			toast.error('Failed to copy payment URL. Please try again or copy manually.');
		}
	};

	const handleGoToLink = () => {
		window.open(paymentUrlPopup.paymentUrl, '_blank');
	};

	const handleCloseUrlPopup = () => {
		setPaymentUrlPopup({
			isOpen: false,
			paymentUrl: '',
			isCopied: false,
		});
		// Don't close main dialog again since it's already closed
	};

	const renderPaymentMethodFields = () => {
		const commonDescriptionField = (
			<Textarea
				label='Description'
				placeholder='Add payment description or notes'
				value={formData.description || ''}
				onChange={(value) => setFormData({ ...formData, description: value })}
				error={errors.description}
			/>
		);

		switch (formData.payment_method_type) {
			case PAYMENT_METHOD_TYPE.OFFLINE:
				return (
					<div className='space-y-3'>
						<Input
							label='Reference ID'
							placeholder='Enter payment reference ID'
							value={formData.reference_id || ''}
							onChange={(value) => setFormData({ ...formData, reference_id: value })}
							error={errors.reference_id}
							description='Enter the reference number or payment details from your payment processor.'
						/>
						<div className='space-y-2 w-full'>
							<DatePicker
								className='w-full'
								label='Recorded At (Optional)'
								popoverTriggerClassName='w-full'
								date={formData.recorded_at}
								setDate={(date) => setFormData({ ...formData, recorded_at: date })}
								placeholder='Select when the payment was recorded (optional)'
								maxDate={new Date()} // Cannot record future payments
							/>
							<p className='text-xs text-muted-foreground'>Optionally select the date when this payment was actually received</p>
							{errors.recorded_at && <p className='text-xs text-red-500'>{errors.recorded_at}</p>}
						</div>
						{commonDescriptionField}
					</div>
				);

			case PAYMENT_METHOD_TYPE.CREDITS:
				return (
					<div className='space-y-3'>
						<Select
							label='Wallet'
							placeholder={
								filteredWallets.length === 0
									? 'No wallets available with matching currency'
									: filteredWallets.length === 1
										? 'Wallet auto-selected'
										: 'Choose a wallet or auto-select'
							}
							options={selectOptions}
							value={formData.wallet_id || (filteredWallets.length > 1 ? '__auto_select__' : '')}
							onChange={(value) => setFormData({ ...formData, wallet_id: value === '__auto_select__' ? '' : value })}
							error={errors.wallet_id}
							description='Select a specific wallet or let the system choose from all wallets.'
							disabled={filteredWallets.length === 0}
						/>
						{commonDescriptionField}
					</div>
				);

			case PAYMENT_METHOD_TYPE.CARD:
			case PAYMENT_METHOD_TYPE.ACH:
				return (
					<div className='space-y-3'>
						<div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
							<div className='text-sm text-gray-600'>
								<span className='font-medium'>{formData.payment_method_type}</span> payment processing is not available yet. Please use
								offline payment method or credits instead.
							</div>
						</div>
					</div>
				);

			case PAYMENT_METHOD_TYPE.PAYMENT_LINK:
				return <div className='space-y-3'>{commonDescriptionField}</div>;

			default:
				return null;
		}
	};

	return (
		<>
			{/* Main Record Payment Dialog */}
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className='bg-white sm:max-w-[500px]'>
					<DialogHeader>
						<DialogTitle className='text-lg font-semibold text-[#18181B]'>Record Payment</DialogTitle>
					</DialogHeader>
					<div className='space-y-4 py-4'>
						<Input
							label='Amount'
							placeholder='0.00'
							variant='formatted-number'
							inputPrefix={getCurrencySymbol(currency)}
							value={formData.amount.toString()}
							onChange={(value) => setFormData({ ...formData, amount: Number(value) || 0 })}
							error={errors.amount}
							description={max_amount ? `Amount Due:${getCurrencySymbol(currency)}${max_amount}` : undefined}
						/>

						<Select
							label='Payment Method'
							placeholder='Select payment method'
							options={paymentMethodOptions}
							value={formData.payment_method_type}
							onChange={(value) => {
								setFormData({
									...formData,
									payment_method_type: value as PAYMENT_METHOD_TYPE,
									selected_connection_id: '', // Reset connection when changing payment method
									// Reset payment method specific fields when changing method
									reference_id: '',
									description: '',
									wallet_id: '',
									recorded_at: undefined,
								});
							}}
							error={errors.payment_method_type}
						/>

						{/* Provider Selection for Payment Links */}
						{formData.payment_method_type === PAYMENT_METHOD_TYPE.PAYMENT_LINK && providerOptions.length > 0 && (
							<Select
								label='Payment Provider'
								placeholder='Select payment provider'
								options={providerOptions}
								value={formData.selected_connection_id}
								onChange={(connectionId) => {
									setFormData({
										...formData,
										selected_connection_id: connectionId,
									});
								}}
								error={errors.selected_connection_id}
							/>
						)}

						{formData.payment_method_type && <div className=''>{renderPaymentMethodFields()}</div>}

						<div className='pt-2 flex justify-end'>
							<Button variant='outline' onClick={() => onOpenChange(false)} className='mr-2'>
								Cancel
							</Button>
							<Button onClick={handleSubmit} disabled={isPending || !formData.payment_method_type} isLoading={isPending}>
								{isPending ? (
									<>
										<LoaderCircleIcon className='w-4 h-4 animate-spin mr-2' />
									</>
								) : (
									'Record'
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Payment URL Success Popup */}
			<PaymentUrlSuccessDialog
				isOpen={paymentUrlPopup.isOpen}
				paymentUrl={paymentUrlPopup.paymentUrl}
				isCopied={paymentUrlPopup.isCopied}
				onClose={handleCloseUrlPopup}
				onCopyUrl={handleCopyUrl}
				onGoToLink={handleGoToLink}
			/>
		</>
	);
};

export default RecordPaymentTopup;
