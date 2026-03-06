import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { DataSourceDefinitionSchema, SiteListItemSchema } from './site.schema';
import { SiteIdSchema, ConfigVersionSchema } from '../shared/schemas/common.schema';

// NestJS createZodDto doesn't play well with discriminated unions for base class extension.
// For DTOs, we'll use a unified shape and validate ruleEvalMode manually or simply allow both.
const UnifiedCreateSiteSchema = z.object({
  siteId: SiteIdSchema,
  ruleEvalMode: z.enum(['PRIORITY', 'SPECIFICITY']),
  dataSources: z.array(DataSourceDefinitionSchema).default([]),
});

const UnifiedStoredSiteSchema = UnifiedCreateSiteSchema.extend({
  configVersion: ConfigVersionSchema,
});

const UnifiedUpdateSiteSchema = z.object({
  ruleEvalMode: z.enum(['PRIORITY', 'SPECIFICITY']).optional(),
  dataSources: z.array(DataSourceDefinitionSchema).optional(),
});

export class CreateSiteDto extends createZodDto(UnifiedCreateSiteSchema) { }
export class SiteListItemDto extends createZodDto(SiteListItemSchema) { }
export class StoredSiteDto extends createZodDto(UnifiedStoredSiteSchema) { }
export class UpdateSiteDto extends createZodDto(UnifiedUpdateSiteSchema) { }
