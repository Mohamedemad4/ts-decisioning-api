import { z } from 'zod';
import {
  SiteIdSchema,
  ConfigVersionSchema,
} from '../shared/schemas/common.schema';

/**
 * Data source definition — currently only BUILTIN type supported.
 * HTTP type is designed but not implemented.
 */
export const DataSourceDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('BUILTIN'),
  builtinId: z.string().min(1),
  params: z.record(z.string(), z.string()),
  requiresMarketingConsent: z.boolean(),
  cache: z.boolean().default(false),
});

export type DataSourceDefinition = z.infer<typeof DataSourceDefinitionSchema>;

/**
 * Shared base fields for site config (without ruleEvalMode-specific rule arrays).
 * The full SiteConfig is a discriminated union — see rules.schema.ts for rule shapes
 * and the composed SiteConfigSchema below.
 */
export const BaseSiteConfigFields = {
  siteId: SiteIdSchema,
  configVersion: ConfigVersionSchema,
  dataSources: z.array(DataSourceDefinitionSchema).default([]),
};

/** Schema for creating/updating a site (without rules — rules are managed via RulesModule) */
export const CreateSiteSchema = z.discriminatedUnion('ruleEvalMode', [
  z.object({
    siteId: SiteIdSchema,
    ruleEvalMode: z.literal('PRIORITY'),
    dataSources: z.array(DataSourceDefinitionSchema).default([]),
  }),
  z.object({
    siteId: SiteIdSchema,
    ruleEvalMode: z.literal('SPECIFICITY'),
    dataSources: z.array(DataSourceDefinitionSchema).default([]),
  }),
]);

export type CreateSite = z.infer<typeof CreateSiteSchema>;

/** Stored site shape (adds configVersion, managed internally) */
export const StoredSiteSchema = z.discriminatedUnion('ruleEvalMode', [
  z.object({
    ...BaseSiteConfigFields,
    ruleEvalMode: z.literal('PRIORITY'),
  }),
  z.object({
    ...BaseSiteConfigFields,
    ruleEvalMode: z.literal('SPECIFICITY'),
  }),
]);

export type StoredSite = z.infer<typeof StoredSiteSchema>;

/** List item shape returned by GET /sites */
export const SiteListItemSchema = z.object({
  siteId: SiteIdSchema,
  configVersion: ConfigVersionSchema,
  ruleEvalMode: z.enum(['PRIORITY', 'SPECIFICITY']),
});

export type SiteListItem = z.infer<typeof SiteListItemSchema>;

export type RuleEvalMode = 'PRIORITY' | 'SPECIFICITY';
