import { Injectable, NotFoundException, OnModuleInit, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteDocument, SiteDoc } from './site.entity';
import { StoredSite, CreateSite, UpdateSite, SiteListItem, RuleEvalMode } from './site.schema';
import { RulesService } from '../rules/rules.service';

@Injectable()
export class SiteService implements OnModuleInit {
  constructor(
    @InjectModel(SiteDocument.name) private siteModel: Model<SiteDoc>,
    @Inject(forwardRef(() => RulesService)) private readonly rulesService: RulesService,
  ) { }

  async onModuleInit() {
    await this.seed();
  }

  /** Seed 2 demo sites — one SPECIFICITY, one PRIORITY */
  private async seed(): Promise<void> {
    const count = await this.siteModel.countDocuments();
    if (count > 0) return;

    await this.siteModel.create([
      {
        siteId: 'site-1',
        configVersion: 'v1',
        ruleEvalMode: 'SPECIFICITY',
        dataSources: [
          {
            id: 'segments',
            type: 'BUILTIN',
            builtinId: 'visitor-segments',
            params: { visitorId: '{{visitorId}}' },
            requiresMarketingConsent: true,
            cache: false,
          },
          {
            id: 'geo',
            type: 'BUILTIN',
            builtinId: 'geo-enrichment',
            params: { country: '{{country}}' },
            requiresMarketingConsent: false,
            cache: true,
          },
        ],
      },
      {
        siteId: 'site-2',
        configVersion: 'v1',
        ruleEvalMode: 'PRIORITY',
        dataSources: [],
      }
    ]);
  }

  async listSites(): Promise<SiteListItem[]> {
    const sites = await this.siteModel.find().exec();
    return sites.map((s) => ({
      siteId: s.siteId,
      configVersion: s.configVersion,
      ruleEvalMode: s.ruleEvalMode as RuleEvalMode,
    }));
  }

  async getSite(siteId: string): Promise<StoredSite> {
    const site = await this.siteModel.findOne({ siteId }).exec();
    if (!site) {
      throw new NotFoundException(`Site '${siteId}' not found`);
    }
    return {
      siteId: site.siteId,
      configVersion: site.configVersion,
      ruleEvalMode: site.ruleEvalMode,
      dataSources: site.dataSources,
    } as StoredSite;
  }

  async getRuleEvalMode(siteId: string): Promise<RuleEvalMode> {
    const site = await this.getSite(siteId);
    return site.ruleEvalMode as RuleEvalMode;
  }

  /** Bump configVersion (called when rules change) */
  async bumpVersion(siteId: string): Promise<string> {
    const site = await this.siteModel.findOne({ siteId }).exec();
    if (!site) {
      throw new NotFoundException(`Site '${siteId}' not found`);
    }
    const currentNum = parseInt(site.configVersion.replace('v', ''), 10) || 0;
    const newVersion = `v${currentNum + 1}`;
    site.configVersion = newVersion;
    await site.save();
    return newVersion;
  }

  async createSite(input: CreateSite): Promise<StoredSite> {
    const existing = await this.siteModel.findOne({ siteId: input.siteId }).exec();
    if (existing) {
      throw new Error(`Site '${input.siteId}' already exists`);
    }
    const created = new this.siteModel({
      ...input,
      configVersion: 'v1',
    });
    const saved = await created.save();
    return {
      siteId: saved.siteId,
      configVersion: saved.configVersion,
      ruleEvalMode: saved.ruleEvalMode,
      dataSources: saved.dataSources,
    } as StoredSite;
  }

  async updateSite(siteId: string, input: UpdateSite): Promise<StoredSite> {
    const site = await this.siteModel.findOne({ siteId }).exec();
    if (!site) {
      throw new NotFoundException(`Site '${siteId}' not found`);
    }


    if (input.ruleEvalMode) {
      site.ruleEvalMode = input.ruleEvalMode;
      if (input.ruleEvalMode === 'PRIORITY') {
        const rules = await this.rulesService.listRules(siteId);
        const invalidRules = rules.filter(r => typeof r.priority !== 'number');
        if (invalidRules.length > 0) {
          throw new BadRequestException(
            `Cannot set mode to PRIORITY. The following rules are missing a priority: ${invalidRules.map(r => r.id).join(', ')}`
          );
        }
      }

    }
    if (input.dataSources) {
      site.dataSources = input.dataSources;
    }

    const currentNum = parseInt(site.configVersion.replace('v', ''), 10) || 0;
    site.configVersion = `v${currentNum + 1}`;

    await site.save();
    return {
      siteId: site.siteId,
      configVersion: site.configVersion,
      ruleEvalMode: site.ruleEvalMode,
      dataSources: site.dataSources,
    } as StoredSite;
  }
}
