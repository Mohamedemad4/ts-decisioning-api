import { z } from 'zod';

export const ConsentSchema = z.object({
  marketing: z.boolean(),
});

export type Consent = z.infer<typeof ConsentSchema>;
