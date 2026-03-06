import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { RulesService } from './rules.service';
import { CreateRuleDto, UpdateRuleDto } from './rules.dto';

@Controller('sites/:siteId/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  async listRules(@Param('siteId') siteId: string) {
    return this.rulesService.listRules(siteId);
  }

  @Get(':ruleId')
  async getRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.rulesService.getRule(siteId, ruleId);
  }

  @Post()
  async createRule(
    @Param('siteId') siteId: string,
    @Body() body: CreateRuleDto,
  ) {
    return this.rulesService.createRule(siteId, body);
  }

  @Put(':ruleId')
  async updateRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: UpdateRuleDto,
  ) {
    return this.rulesService.updateRule(siteId, ruleId, body);
  }

  @Delete(':ruleId')
  @HttpCode(204)
  async deleteRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
  ) {
    await this.rulesService.deleteRule(siteId, ruleId);
  }
}
