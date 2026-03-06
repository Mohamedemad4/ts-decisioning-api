import { z } from 'zod';

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const GenerateCopyRequestSchema = z.object({
  visitorData: z.record(z.string(), z.any()),
  allowedClaims: z.array(ClaimSchema).min(1),
  context: z.string().optional(),
});

export const GenerateCopyResponseSchema = z.object({
  headline1: z.string(),
  headline2: z.string(),
  usedClaimIds: z.array(z.string()),
  retryCount: z.number(),
});

export type Claim = z.infer<typeof ClaimSchema>;
export type GenerateCopyRequest = z.infer<typeof GenerateCopyRequestSchema>;
export type GenerateCopyResponse = z.infer<typeof GenerateCopyResponseSchema>;
