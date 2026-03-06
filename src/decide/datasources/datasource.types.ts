import { z } from 'zod';

/**
 * Built-in data source interface.
 * Each built-in is an async function registered by ID.
 * They simulate external lookups (CRM, CDP, billing, etc.) but run in-process.
 * They are async because in production they would do real I/O.
 */
export interface BuiltinDataSource {
  /** Unique identifier for this data source */
  id: string;

  /** Whether this data source requires marketing consent to be called */
  requiresMarketingConsent: boolean;

  /** Zod schema describing the expected input shape */
  inputShape: z.ZodObject<any>;

  /** Zod schema describing the output shape */
  outputShape: z.ZodObject<any>;

  /** The async resolver function */
  resolve: (input: Record<string, any>) => Promise<Record<string, any>>;
}

/**
 * Shape returned by GET /decide/datasources for frontend consumption.
 */
export const DataSourceInfoSchema = z.object({
  id: z.string(),
  requiresMarketingConsent: z.boolean(),
  inputShape: z.record(z.string(), z.string()),
  outputShape: z.record(z.string(), z.string()),
});

export type DataSourceInfo = z.infer<typeof DataSourceInfoSchema>;
