import { Controller, Post, Get, Body } from '@nestjs/common';
import { DecideService } from './decide.service';
import { DecideRequestDto } from './decide.dto';
import { DataSourceRegistry } from './datasources/datasource.registry';

@Controller('decide')
export class DecideController {
  constructor(
    private readonly decideService: DecideService,
    private readonly registry: DataSourceRegistry,
  ) {}

  @Post()
  async decide(@Body() body: DecideRequestDto) {
    return this.decideService.evaluateRules(body);
  }

  @Get('datasources')
  async listBuiltInDatasources() {
    return this.registry.getAll().map((ds) => ({
      id: ds.id,
      requiresMarketingConsent: ds.requiresMarketingConsent,
      inputShape: ds.inputShape.shape, // Simplified output for frontend mapping
      outputShape: ds.outputShape.shape,
    }));
  }
}
