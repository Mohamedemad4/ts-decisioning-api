import { z } from 'zod';
import { RuleIdSchema } from '../shared/schemas/common.schema';

/**
 * Base fields shared by all rules regardless of eval mode.
 */
export const BaseRuleFields = {
  id: RuleIdSchema,
  description: z.string().optional(),
  conditions: z.record(z.string(), z.string()),
  dataSources: z.array(z.string()).optional(),
  variantId: z.string().min(1),
  headline: z.string().min(1),
  flags: z.record(z.string(), z.boolean()).optional(),
};

/**
 * Rule shape for PRIORITY mode — priority is REQUIRED.
 */
export const PriorityRuleSchema = z.object({
  ...BaseRuleFields,
  priority: z.number(),
});

export type PriorityRule = z.infer<typeof PriorityRuleSchema>;

/**
 * Rule shape for SPECIFICITY mode — priority is OPTIONAL (tiebreaker only).
 */
export const SpecificityRuleSchema = z.object({
  ...BaseRuleFields,
  priority: z.number().optional(),
});

export type SpecificityRule = z.infer<typeof SpecificityRuleSchema>;

/**
 * Generic rule type (union of both modes).
 */
export type Rule = PriorityRule | SpecificityRule;

/**
 * Schema for creating a rule — accepts either shape.
 * The controller validates against the site's ruleEvalMode at runtime.
 */
export const CreateRuleSchema = z.object({
  ...BaseRuleFields,
  priority: z.number().optional(),
});

export type CreateRule = z.infer<typeof CreateRuleSchema>;

/**
 * Schema for updating a rule (all fields optional except id).
 */
export const UpdateRuleSchema = z.object({
  description: z.string().optional(),
  conditions: z.record(z.string(), z.string()).optional(),
  dataSources: z.array(z.string()).optional(),
  variantId: z.string().min(1).optional(),
  headline: z.string().min(1).optional(),
  flags: z.record(z.string(), z.boolean()).optional(),
  priority: z.number().optional(),
});

export type UpdateRule = z.infer<typeof UpdateRuleSchema>;
