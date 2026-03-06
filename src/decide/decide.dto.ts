import { createZodDto } from 'nestjs-zod';
import { DecideRequestSchema, DecideResponseSchema } from './decide.schema';

export class DecideRequestDto extends createZodDto(DecideRequestSchema) {}
export class DecideResponseDto extends createZodDto(DecideResponseSchema) {}
