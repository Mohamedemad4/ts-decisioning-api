import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { SiteModule } from '../site/site.module';
import { RuleDocument, RuleSchema } from './rules.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RuleDocument.name, schema: RuleSchema }]),
    forwardRef(() => SiteModule),
  ],
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
