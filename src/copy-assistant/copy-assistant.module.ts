import { Module } from '@nestjs/common';
import { CopyAssistantController } from './copy-assistant.controller';
import { CopyAssistantService } from './copy-assistant.service';

@Module({
  controllers: [CopyAssistantController],
  providers: [CopyAssistantService],
  exports: [CopyAssistantService],
})
export class CopyAssistantModule {}
