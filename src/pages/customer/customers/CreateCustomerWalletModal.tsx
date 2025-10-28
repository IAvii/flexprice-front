import { Button, DatePicker, Input, Select } from '@/components/atoms';
import { currencyOptions } from '@/constants/constants';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { cn } from '@/lib/utils';
import { Wallet, WALLET_CONFIG_PRICE_TYPE } from '@/models';
import WalletApi from '@/api/WalletApi';
import { getCurrencySymbol } from '@/utils';
import { useMutation } from '@tanstack/react-query';
import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { CreateWalletPayload } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';

interface Props {
	customerId: string;
	onSuccess?: (walletId: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const CreateCustomerWalletModal: FC<Props> = ({ customerId, onSuccess = () => {}, open, onOpenChange }) => {
	const [errors, setErrors] = useState({
		currency: '',
		name: '',
		initial_credits_to_load: '',
		conversion_rate: '',
	});

	const [walletPayload, setwalletPayload] = useState<CreateWalletPayload>({
		currency: '',
		initial_credits_to_load: 0,
		conversion_rate: 1,
		name: 'Prepaid Wallet',
		config: {
			allowed_price_types: [WALLET_CONFIG_PRICE_TYPE.ALL],
		},
		customer_id: customerId,
	});

	const { mutateAsync: createWallet, isPending } = useMutation({
		mutationKey: ['createWallet', customerId],
		mutationFn: async () => {
			return await WalletApi.createWallet({
				customer_id: customerId,
				currency: walletPayload.currency,
				name: walletPayload.name,
				initial_credits_to_load: walletPayload.initial_credits_to_load,
				conversion_rate: walletPayload.conversion_rate,
				initial_credits_expiry_date_utc: walletPayload.initial_credits_expiry_date_utc,
				config: walletPayload.config,
			});
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'An error occurred while creating wallet');
		},
		onSuccess: async (data: Wallet) => {
			toast.success('Wallet created successfully');
			onSuccess(data.id);
			await refetchQueries(['fetchWallets']);
			await refetchQueries(['fetchWalletBalances']);
			await refetchQueries(['fetchWalletsTransactions']);
		},
	});

	const handleCreateWallet = async () => {
		if (!walletPayload.name) {
			setErrors((prev) => ({ ...prev, name: 'Wallet name is required' }));
			return;
		}

		if (!walletPayload.currency) {
			setErrors((prev) => ({ ...prev, currency: 'Currency is required' }));
			return;
		}

		const wallet = await createWallet();
		return wallet.id;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='bg-white sm:max-w-[600px] max-h-[80vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Create Wallet</DialogTitle>
					<DialogDescription>Define the wallet details and the currency it will operate in.</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 py-4'>
					<Input
						error={errors.name}
						value={walletPayload.name}
						onChange={(e) => setwalletPayload({ ...walletPayload, name: e })}
						label='Wallet Name'
						placeholder='Enter wallet name'
					/>

					<Select
						value={walletPayload.currency}
						options={currencyOptions}
						label='Select Currency'
						onChange={(e) => setwalletPayload({ ...walletPayload, currency: e })}
						placeholder='Select Currency'
						error={errors.currency}
					/>

					<div className='flex flex-col items-start gap-2 w-full'>
						<label className={cn(' block text-sm font-medium', 'text-zinc-950')}>Conversion Rate</label>
						<div className='flex items-center gap-2 w-full'>
							<Input className='w-full' value={'1'} disabled suffix='credit' />
							<span>=</span>
							<Input
								className='w-full'
								variant='number'
								suffix={getCurrencySymbol(walletPayload.currency || '')}
								value={walletPayload.conversion_rate}
								onChange={(e) => {
									setwalletPayload({ ...walletPayload, conversion_rate: e as unknown as number });
								}}
							/>
						</div>
					</div>
					<Input
						label='Free Credits'
						suffix='credits'
						variant='formatted-number'
						placeholder='Enter Free Credits to be added to the wallet'
						value={walletPayload.initial_credits_to_load}
						onChange={(e) => {
							setwalletPayload({ ...walletPayload, initial_credits_to_load: e as unknown as number });
						}}
					/>

					<Select
						value={walletPayload.config?.allowed_price_types?.[0] || WALLET_CONFIG_PRICE_TYPE.ALL}
						options={[
							{ label: 'All Price Types', value: WALLET_CONFIG_PRICE_TYPE.ALL },
							{ label: 'Usage Only', value: WALLET_CONFIG_PRICE_TYPE.USAGE },
							{ label: 'Fixed Only', value: WALLET_CONFIG_PRICE_TYPE.FIXED },
						]}
						label='Allowed Price Types'
						onChange={(e) =>
							setwalletPayload({
								...walletPayload,
								config: {
									allowed_price_types: [e as WALLET_CONFIG_PRICE_TYPE],
								},
							})
						}
						placeholder='Select Allowed Price Types'
					/>

					<div>
						<DatePicker
							labelClassName='text-foreground'
							label='Free Credits Expiry Date'
							minDate={new Date()}
							placeholder='Select Expiry Date'
							date={walletPayload.initial_credits_expiry_date_utc}
							setDate={(e) => {
								setwalletPayload({ ...walletPayload, initial_credits_expiry_date_utc: e as unknown as Date });
							}}
						/>
					</div>

					<div className='w-full justify-end flex'>
						<Button isLoading={isPending} disabled={isPending} onClick={handleCreateWallet}>
							Save Wallet
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default CreateCustomerWalletModal;
