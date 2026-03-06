import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { RulesModule } from '../rules/rules.module';
import { SiteDocument, SiteSchema } from './site.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SiteDocument.name, schema: SiteSchema }]),
    forwardRef(() => RulesModule)
  ],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
