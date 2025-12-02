import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Loader, Page } from '@/components/atoms';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import ConnectionApi from '@/api/ConnectionApi';
import { CONNECTION_PROVIDER_TYPE } from '@/models/Connection';

const QuickBooksOAuthCallback = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const hasProcessed = useRef(false); // Prevent double processing

	const code = searchParams.get('code');
	const realmId = searchParams.get('realmId');
	const state = searchParams.get('state');
	const errorParam = searchParams.get('error');

	// Get stored connection data and state
	const storedState = sessionStorage.getItem('qb_oauth_state');
	const storedConnectionData = sessionStorage.getItem('qb_connection_data');

	// Debug logging
	useEffect(() => {
		console.log('🔍 QuickBooks OAuth Callback Debug:', {
			receivedState: state,
			storedState: storedState,
			stateMatch: state === storedState,
			code: code?.substring(0, 20) + '...',
			realmId,
			hasStoredData: !!storedConnectionData,
			hasProcessed: hasProcessed.current,
		});
	}, [state, storedState, code, realmId, storedConnectionData]);

	// Validate state
	useEffect(() => {
		// Prevent double processing
		if (hasProcessed.current) {
			console.log('⏭️ Already processed, skipping validation');
			return;
		}

		if (errorParam) {
			setError(`OAuth error: ${errorParam}`);
			toast.error(`QuickBooks authorization failed: ${errorParam}`);
			setTimeout(() => {
				navigate('/tools/integrations/quickbooks');
			}, 3000);
			return;
		}

		if (!code || !realmId) {
			setError('Missing authorization code or realm ID');
			toast.error('QuickBooks authorization failed: Missing required parameters');
			setTimeout(() => {
				navigate('/tools/integrations/quickbooks');
			}, 3000);
			return;
		}

		if (state !== storedState) {
			setError('Invalid state parameter');
			toast.error('QuickBooks authorization failed: Invalid state parameter');
			setTimeout(() => {
				navigate('/tools/integrations/quickbooks');
			}, 3000);
			return;
		}

		if (!storedConnectionData) {
			setError('Connection data not found');
			toast.error('QuickBooks authorization failed: Connection data not found');
			setTimeout(() => {
				navigate('/tools/integrations/quickbooks');
			}, 3000);
			return;
		}
	}, [code, realmId, state, storedState, storedConnectionData, errorParam, navigate]);

	const { mutate: createConnection, isPending } = useMutation({
		mutationFn: async () => {
			if (!code || !realmId || !storedConnectionData) {
				throw new Error('Missing required parameters');
			}

			const connectionData = JSON.parse(storedConnectionData);

			// Create connection with auth_code
			// Backend will automatically exchange auth_code for tokens on first API call
			const payload: any = {
				name: connectionData.name,
				provider_type: CONNECTION_PROVIDER_TYPE.QUICKBOOKS,
				encrypted_secret_data: {
					provider_type: CONNECTION_PROVIDER_TYPE.QUICKBOOKS,
					client_id: connectionData.client_id,
					client_secret: connectionData.client_secret,
					realm_id: realmId,
					environment: connectionData.environment,
					auth_code: code,
					redirect_uri: connectionData.redirect_uri,
					income_account_id: connectionData.income_account_id || undefined,
				},
				sync_config: {},
			};

			// Only add invoice config if toggle is true
			if (connectionData.sync_config?.invoice) {
				payload.sync_config = {
					invoice: {
						inbound: false,
						outbound: true,
					},
				};
			}

			return await ConnectionApi.Create(payload);
		},
		onSuccess: () => {
			// Clean up session storage
			sessionStorage.removeItem('qb_oauth_state');
			sessionStorage.removeItem('qb_connection_data');

			toast.success('QuickBooks connection created successfully');
			navigate('/tools/integrations/quickbooks');
		},
		onError: (error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : 'Failed to create connection';
			setError(errorMessage);
			toast.error(errorMessage);
			setTimeout(() => {
				navigate('/tools/integrations/quickbooks');
			}, 3000);
		},
	});

	// Create connection when component mounts and validation passes
	useEffect(() => {
		if (code && realmId && state === storedState && storedConnectionData && !errorParam && !isPending && !error && !hasProcessed.current) {
			hasProcessed.current = true; // Mark as processed
			console.log('✅ Starting connection creation');
			createConnection();
		}
	}, [code, realmId, state, storedState, storedConnectionData, errorParam, createConnection, isPending, error]);

	if (error) {
		return (
			<Page>
				<div className='flex flex-col items-center justify-center min-h-[400px]'>
					<div className='text-red-600 text-lg font-semibold mb-2'>Authorization Failed</div>
					<div className='text-gray-600 mb-4'>{error}</div>
					<div className='text-sm text-gray-500'>Redirecting back to integrations...</div>
				</div>
			</Page>
		);
	}

	return (
		<Page>
			<div className='flex flex-col items-center justify-center min-h-[400px]'>
				<Loader />
				<div className='mt-4 text-gray-600'>Completing QuickBooks authorization...</div>
				<div className='mt-2 text-sm text-gray-500'>Please wait while we create your connection</div>
			</div>
		</Page>
	);
};

export default QuickBooksOAuthCallback;
