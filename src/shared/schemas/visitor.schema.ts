import { z } from 'zod';

/**
 * Visitor traits schema — hardcoded shape.
 * Future: dynamic per site.
 */
export const VisitorTraitsSchema = z.object({
  country: z.string().optional(),
  language: z.string().optional(),
  deviceType: z.string().optional(),
  referrerDomain: z.string().optional(),
});

export type VisitorTraits = z.infer<typeof VisitorTraitsSchema>;

/**
 * Consent-safe fields constant.
 * These fields can ALWAYS be used in rule evaluation regardless of marketing consent.
 * Any field NOT in this list requires marketing consent.
 */
export const CONSENT_SAFE_FIELDS = [
  'country',
  'language',
  'deviceType',
  'referrerDomain',
] as const;

export type ConsentSafeField = (typeof CONSENT_SAFE_FIELDS)[number];
