/**
 * Format a number with thousands separators and optional decimal places
 * @param value The number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted number string
 */
const formatNumber = (value: number, decimals: number = 0): string => {
	if (!value) return '-';

	// Clamp decimals to valid range (0-20)
	const clampedDecimals = Math.max(0, Math.min(20, decimals));

	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: clampedDecimals,
		maximumFractionDigits: clampedDecimals,
	}).format(value);
};

export default formatNumber;
