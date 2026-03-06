import { Module } from '@nestjs/common';
import { DecideService } from './decide.service';
import { DecideController } from './decide.controller';
import { SiteModule } from '../site/site.module';
import { RulesModule } from '../rules/rules.module';
import { DataSourceRegistry } from './datasources/datasource.registry';

@Module({
  imports: [SiteModule, RulesModule],
  controllers: [DecideController],
  providers: [DecideService, DataSourceRegistry],
  exports: [DecideService],
})
export class DecideModule {}
