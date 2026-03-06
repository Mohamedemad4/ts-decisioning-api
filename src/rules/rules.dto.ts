import { createZodDto } from 'nestjs-zod';
import { CreateRuleSchema, UpdateRuleSchema, SpecificityRuleSchema } from './rules.schema';

export class CreateRuleDto extends createZodDto(CreateRuleSchema) {}
export class UpdateRuleDto extends createZodDto(UpdateRuleSchema) {}
export class RuleResponseDto extends createZodDto(SpecificityRuleSchema) {}
