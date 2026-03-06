import {
  Controller,
  Get,
  Param,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SiteService } from './site.service';
import { RulesService } from '../rules/rules.service';

@Controller()
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly rulesService: RulesService,
  ) {}

  /** GET /sites — list all sites */
  @Get('sites')
  async listSites() {
    return this.siteService.listSites();
  }

  /** GET /sites/:siteId — get site detail */
  @Get('sites/:siteId')
  async getSite(@Param('siteId') siteId: string) {
    return this.siteService.getSite(siteId);
  }

  /**
   * GET /config/:siteId — full config with rules + ETag/Cache-Control.
   * This is the cached endpoint for CDN/edge consumption.
   */
  @Get('config/:siteId')
  async getConfig(
    @Param('siteId') siteId: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ) {
    const site = await this.siteService.getSite(siteId);
    const etag = `"${site.configVersion}"`;

    // 304 Not Modified
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    const rules = await this.rulesService.listRules(siteId);

    res.set({
      ETag: etag,
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    });

    res.json({
      siteId: site.siteId,
      configVersion: site.configVersion,
      ruleEvalMode: site.ruleEvalMode,
      dataSources: site.dataSources,
      rules,
    });
  }
}
