/**
 * Enum for Razorpay webhook events used in the application
 * This provides type safety and prevents typos when working with webhook events
 */
export enum RazorpayWebhookEvents {
	// Payment events
	PAYMENT_CAPTURED = 'payment.captured',
	PAYMENT_FAILED = 'payment.failed',
}

/**
 * Helper function to get default webhook events
 * @returns Array of default Razorpay webhook events
 */
export const getDefaultRazorpayWebhookEvents = (): RazorpayWebhookEvents[] => [
	RazorpayWebhookEvents.PAYMENT_CAPTURED,
	RazorpayWebhookEvents.PAYMENT_FAILED,
];
