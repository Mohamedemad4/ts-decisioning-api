import { Body, Controller, Post } from '@nestjs/common';
import { CopyAssistantService } from './copy-assistant.service';
import {
  GenerateCopyRequestDto,
  GenerateCopyResponseDto,
} from './copy-assistant.dto';

@Controller('copy-assistant')
export class CopyAssistantController {
  constructor(private readonly copyAssistantService: CopyAssistantService) {}

  @Post('generate')
  async generateCopy(
    @Body() request: GenerateCopyRequestDto,
  ): Promise<GenerateCopyResponseDto> {
    return this.copyAssistantService.generateCopy(request);
  }
}
