import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Toggle, Select } from '@/components/atoms';
import { toast } from 'react-hot-toast';
import { AlertSettings, AlertThreshold } from '@/models/Feature';

interface FeatureAlertDialogProps {
	open: boolean;
	alertSettings: AlertSettings | undefined;
	onSave: (alertSettings: AlertSettings) => void;
	onClose: () => void;
}

const FeatureAlertDialog: React.FC<FeatureAlertDialogProps> = ({ open, alertSettings, onSave, onClose }) => {
	const [localAlertSettings, setLocalAlertSettings] = useState<AlertSettings>({
		alert_enabled: false,
		critical: undefined,
		warning: undefined,
		info: undefined,
	});

	// Sync local state with props
	useEffect(() => {
		if (alertSettings) {
			setLocalAlertSettings({
				alert_enabled: alertSettings.alert_enabled || false,
				critical: alertSettings.critical,
				warning: alertSettings.warning,
				info: alertSettings.info,
			});
		} else {
			setLocalAlertSettings({
				alert_enabled: false,
				critical: undefined,
				warning: undefined,
				info: undefined,
			});
		}
	}, [alertSettings, open]);

	const handleSave = () => {
		// Validation
		if (localAlertSettings.alert_enabled) {
			// At least one threshold should be set
			if (!localAlertSettings.critical && !localAlertSettings.warning && !localAlertSettings.info) {
				toast.error('Please configure at least one threshold level');
				return;
			}

			// Validate threshold values
			const validateThreshold = (threshold: AlertThreshold | undefined, name: string) => {
				if (threshold) {
					if (!threshold.threshold || parseFloat(threshold.threshold) < 0) {
						toast.error(`Please enter a valid ${name} threshold value`);
						return false;
					}
				}
				return true;
			};

			if (!validateThreshold(localAlertSettings.critical, 'critical')) return;
			if (!validateThreshold(localAlertSettings.warning, 'warning')) return;
			if (!validateThreshold(localAlertSettings.info, 'info')) return;

			// Validate threshold ordering for "below" condition
			if (localAlertSettings.critical?.condition === 'below') {
				const criticalVal = localAlertSettings.critical ? parseFloat(localAlertSettings.critical.threshold) : null;
				const warningVal = localAlertSettings.warning ? parseFloat(localAlertSettings.warning.threshold) : null;
				const infoVal = localAlertSettings.info ? parseFloat(localAlertSettings.info.threshold) : null;

				if (criticalVal !== null && warningVal !== null && criticalVal >= warningVal) {
					toast.error('For "below" condition: warning threshold must be greater than critical threshold');
					return;
				}
				if (warningVal !== null && infoVal !== null && warningVal >= infoVal) {
					toast.error('For "below" condition: info threshold must be greater than warning threshold');
					return;
				}
				if (criticalVal !== null && infoVal !== null && criticalVal >= infoVal) {
					toast.error('For "below" condition: info threshold must be greater than critical threshold');
					return;
				}
			}

			// Validate threshold ordering for "above" condition
			if (localAlertSettings.critical?.condition === 'above') {
				const criticalVal = localAlertSettings.critical ? parseFloat(localAlertSettings.critical.threshold) : null;
				const warningVal = localAlertSettings.warning ? parseFloat(localAlertSettings.warning.threshold) : null;
				const infoVal = localAlertSettings.info ? parseFloat(localAlertSettings.info.threshold) : null;

				if (criticalVal !== null && warningVal !== null && criticalVal <= warningVal) {
					toast.error('For "above" condition: critical threshold must be greater than warning threshold');
					return;
				}
				if (warningVal !== null && infoVal !== null && warningVal <= infoVal) {
					toast.error('For "above" condition: warning threshold must be greater than info threshold');
					return;
				}
				if (criticalVal !== null && infoVal !== null && criticalVal <= infoVal) {
					toast.error('For "above" condition: critical threshold must be greater than info threshold');
					return;
				}
			}
		}

		onSave(localAlertSettings);
	};

	const handleClose = () => {
		// Reset to original values
		if (alertSettings) {
			setLocalAlertSettings({
				alert_enabled: alertSettings.alert_enabled || false,
				critical: alertSettings.critical,
				warning: alertSettings.warning,
				info: alertSettings.info,
			});
		}
		onClose();
	};

	const handleThresholdChange = (level: 'critical' | 'warning' | 'info', field: 'threshold' | 'condition', value: string) => {
		setLocalAlertSettings((prev: AlertSettings) => {
			const currentThreshold = prev[level] || { threshold: '0', condition: 'below' as const };

			// If condition is being changed, sync all other thresholds to use the same condition
			if (field === 'condition') {
				const newCondition = value as 'above' | 'below';
				return {
					...prev,
					critical: prev.critical ? { ...prev.critical, condition: newCondition } : undefined,
					warning: prev.warning ? { ...prev.warning, condition: newCondition } : undefined,
					info: prev.info ? { ...prev.info, condition: newCondition } : undefined,
				};
			}

			return {
				...prev,
				[level]: {
					...currentThreshold,
					[field]: value,
				},
			};
		});
	};

	const handleRemoveThreshold = (level: 'critical' | 'warning' | 'info') => {
		setLocalAlertSettings((prev: AlertSettings) => ({
			...prev,
			[level]: undefined,
		}));
	};

	const handleAddThreshold = (level: 'critical' | 'warning' | 'info') => {
		const defaultCondition =
			localAlertSettings.critical?.condition || localAlertSettings.warning?.condition || localAlertSettings.info?.condition || 'below';
		setLocalAlertSettings((prev: AlertSettings) => ({
			...prev,
			[level]: {
				threshold: '0',
				condition: defaultCondition,
			},
		}));
	};

	const renderThresholdInput = (level: 'critical' | 'warning' | 'info', label: string, description: string) => {
		const threshold = localAlertSettings[level];

		return (
			<div className='space-y-3 p-4 border rounded-lg bg-gray-50'>
				<div className='flex items-center justify-between'>
					<div>
						<label className='text-sm font-medium text-gray-900'>{label}</label>
						<p className='text-xs text-gray-500 mt-0.5'>{description}</p>
					</div>
					{threshold ? (
						<Button variant='ghost' size='sm' onClick={() => handleRemoveThreshold(level)}>
							Remove
						</Button>
					) : (
						<Button variant='outline' size='sm' onClick={() => handleAddThreshold(level)}>
							Add
						</Button>
					)}
				</div>

				{threshold && (
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1'>
							<label className='text-xs font-medium text-gray-700'>Threshold Value</label>
							<Input
								placeholder='0.00'
								value={threshold.threshold}
								onChange={(value) => handleThresholdChange(level, 'threshold', value)}
								type='number'
								step='0.01'
								min='0'
							/>
						</div>
						<div className='space-y-1'>
							<label className='text-xs font-medium text-gray-700'>Condition</label>
							<Select
								options={[
									{ label: 'Below', value: 'below' },
									{ label: 'Above', value: 'above' },
								]}
								value={threshold.condition}
								onChange={(value) => handleThresholdChange(level, 'condition', value)}
							/>
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<Dialog
			className='min-w-max'
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) handleClose();
			}}
			title='Feature Alert Settings'
			showCloseButton>
			<div className='flex flex-col gap-6 min-w-[600px]'>
				{/* Alert Toggle */}
				<Toggle
					title='Enable Alerts'
					label='Monitor feature usage against wallet balance thresholds'
					description='Get notified when wallet balance crosses configured thresholds for this feature'
					checked={localAlertSettings.alert_enabled || false}
					onChange={(enabled) => setLocalAlertSettings((prev: AlertSettings) => ({ ...prev, alert_enabled: enabled }))}
				/>

				{/* Alert Configuration */}
				{localAlertSettings.alert_enabled && (
					<div className='space-y-4'>
						<div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md'>
							<p className='text-xs text-blue-800'>
								Configure thresholds to monitor wallet balance. Alerts trigger when balance crosses these thresholds. All thresholds must
								use the same condition (above or below).
							</p>
						</div>

						{renderThresholdInput('critical', 'Critical Threshold', 'Alert when balance reaches critical level')}
						{renderThresholdInput('warning', 'Warning Threshold', 'Alert when balance reaches warning level')}
						{renderThresholdInput('info', 'Info Threshold', 'Alert when balance reaches info level')}
					</div>
				)}

				{/* Action Buttons */}
				<div className='flex justify-end gap-2 mt-6'>
					<Button variant='outline' onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save Changes</Button>
				</div>
			</div>
		</Dialog>
	);
};

export default FeatureAlertDialog;
