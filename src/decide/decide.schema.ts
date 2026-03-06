import { z } from 'zod';
import { SiteIdSchema } from '../shared/schemas/common.schema';
import { ConsentSchema } from '../shared/schemas/consent.schema';
import { VisitorTraitsSchema } from '../shared/schemas/visitor.schema';

/**
 * POST /decide request body.
 */
export const DecideRequestSchema = z.object({
  siteId: SiteIdSchema,
  visitorId: z.string().optional(),
  url: z.string().optional(),
  consent: ConsentSchema,
  traits: VisitorTraitsSchema,
});

export type DecideRequest = z.infer<typeof DecideRequestSchema>;

/**
 * POST /decide response body.
 */
export const DecideResponseSchema = z.object({
  variantId: z.string(),
  headline: z.string(),
  flags: z.record(z.string(), z.boolean()).optional(),
  configVersion: z.string(),
});

export type DecideResponse = z.infer<typeof DecideResponseSchema>;
