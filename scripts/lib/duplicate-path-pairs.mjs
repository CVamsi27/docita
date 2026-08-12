/**
 * Canonical directory pairs scanned for parallel file hierarchies.
 * `toleratedRelativePaths`: known debt — still reported in verbose mode, not a failure.
 */
export const DUPLICATE_PATH_PAIRS = [
  {
    id: "shared-common-modules",
    label: "shared/common ↔ shared/modules",
    roots: [
      "apps/api/src/shared/common",
      "apps/api/src/shared/modules",
    ],
    toleratedRelativePaths: [],
  },
  {
    id: "razorpay-webhook-controllers",
    label:
      "subscriptions Razorpay webhook ↔ billing Razorpay webhook (same route shape)",
    roots: [
      "apps/api/src/domains/subscriptions/presentation/controllers",
      "apps/api/src/domains/billing/presentation/controllers",
    ],
    toleratedRelativePaths: [],
    /** Only flag files whose basename matches (both domains expose POST .../razorpay). */
    fileNamePattern: /webhook/i,
  },
];
