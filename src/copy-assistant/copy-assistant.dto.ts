import { createZodDto } from 'nestjs-zod';
import {
  GenerateCopyRequestSchema,
  GenerateCopyResponseSchema,
} from './copy-assistant.schema';

export class GenerateCopyRequestDto extends createZodDto(
  GenerateCopyRequestSchema,
) {}

export class GenerateCopyResponseDto extends createZodDto(
  GenerateCopyResponseSchema,
) {}
