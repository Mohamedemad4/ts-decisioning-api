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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto, UpdateRuleDto } from './rules.dto';

@ApiTags('Rules')
@Controller('sites/:siteId/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) { }

  @Get()
  @ApiOperation({ summary: 'List all rules for a site' })
  async listRules(@Param('siteId') siteId: string) {
    return this.rulesService.listRules(siteId);
  }

  @Get(':ruleId')
  @ApiOperation({ summary: 'Get a specific rule by ID' })
  async getRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.rulesService.getRule(siteId, ruleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new rule' })
  async createRule(
    @Param('siteId') siteId: string,
    @Body() body: CreateRuleDto,
  ) {
    return this.rulesService.createRule(siteId, body);
  }

  @Put(':ruleId')
  @ApiOperation({ summary: 'Update an existing rule' })
  async updateRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: UpdateRuleDto,
  ) {
    return this.rulesService.updateRule(siteId, ruleId, body);
  }

  @Delete(':ruleId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a rule' })
  async deleteRule(
    @Param('siteId') siteId: string,
    @Param('ruleId') ruleId: string,
  ) {
    await this.rulesService.deleteRule(siteId, ruleId);
  }
}
