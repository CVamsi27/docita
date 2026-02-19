/**
 * Subscription Module Constants
 *
 * Centralized location for all subscription-related business constants.
 * These values are used across billing, referral, and lifecycle services.
 *
 * Change Log:
 * - 2026-02-19: Consolidated from 3 duplicate definitions and scattered values
 */

/**
 * Referral Program Configuration
 */
export const REFERRAL_DISCOUNT_PERCENT = 25; // Percentage discount for referred customers
export const MAX_REFERRAL_CREDITS_PER_YEAR = 12; // Maximum number of referral credits a clinic can claim annually

/**
 * Billing Cycle Configuration
 */
export const GRACE_PERIOD_DAYS = 3; // Days allowed after billing failure before suspension
export const SEMI_ANNUAL_DISCOUNT_PERCENT = 5; // Discount percentage for semi-annual billing cycle
