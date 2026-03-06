import { z } from 'zod';

export const SiteIdSchema = z.string().min(1);
export const ConfigVersionSchema = z.string().min(1);
export const RuleIdSchema = z.string().min(1);
