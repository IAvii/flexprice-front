import { NODE_ENV, NodeEnv } from '@/types/env';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

const isProd = NODE_ENV === NodeEnv.PROD;
const LAST_DISMISSED_VERSION = 'lastDismissedVersion';

export default function useVersionCheck(intervalMs = 5 * 60 * 1000) {
	const currentVersion = __APP_VERSION__;

	useEffect(() => {
		if (!isProd) {
			console.log(`[VersionCheck] Skipped in dev mode mode mode is ${NODE_ENV}`);
			return;
		}

		const refreshIfNewBuild = async () => {
			try {
				const res = await fetch(`/meta.json?t=${Date.now()}`, { cache: 'no-cache' });
				if (!res.ok) {
					throw new Error(`HTTP error! status: ${res.status}`);
				}
				const meta = await res.json();
				const latestVersion = meta.versionId;
				const dismissedVersion = localStorage.getItem(LAST_DISMISSED_VERSION);
				const timestamp = new Date().toISOString();
				if (latestVersion !== currentVersion) {
					if (dismissedVersion === latestVersion) {
						console.info(`[VersionCheck][${timestamp}] Dismissed version: ${latestVersion}`);
						return;
					}

					console.info(`[VersionCheck][${timestamp}] New version detected. Current: ${currentVersion}, Latest: ${latestVersion}`);
					const toastId = toast(
						(t) => (
							<div className='text-sm text-black rounded flex justify-between items-center'>
								<span>New version available!</span>
								<button
									className='ml-4 bg-black text-white px-2 py-1 rounded'
									onClick={() => {
										toast.dismiss(t.id);
										window.location.reload();
									}}>
									Update
								</button>
								<button
									className='ml-4 bg-black text-white px-2 py-1 rounded'
									onClick={() => {
										localStorage.setItem(LAST_DISMISSED_VERSION, latestVersion);
										toast.dismiss(toastId);
									}}>
									Ignore
								</button>
							</div>
						),
						{
							duration: Infinity,
							id: 'version-check-notification',
							position: 'bottom-right',
						},
					);
				} else {
					console.debug(`[VersionCheck][${timestamp}] App is up-to-date. Version: ${currentVersion}`);
				}
			} catch (err) {
				console.error('Error checking version', err);
			}
		};

		// Run immediately
		refreshIfNewBuild();

		// Set interval
		const intervalId = setInterval(refreshIfNewBuild, intervalMs);
		return () => clearInterval(intervalId);
	}, [intervalMs]);
}
