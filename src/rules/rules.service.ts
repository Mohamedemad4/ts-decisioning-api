import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RuleDocument, RuleDoc } from './rules.entity';
import { Rule, CreateRule, UpdateRule } from './rules.schema';
import { SiteService } from '../site/site.service';

@Injectable()
export class RulesService implements OnModuleInit {
  constructor(
    @InjectModel(RuleDocument.name) private ruleModel: Model<RuleDoc>,
    private readonly siteService: SiteService,
  ) { }

  async onModuleInit() {
    await this.seed();
  }

  private async seed(): Promise<void> {
    const count = await this.ruleModel.countDocuments();
    if (count > 0) return;

    // Wait a tick to ensure site is seeded
    await new Promise(res => setTimeout(res, 500));

    await this.ruleModel.insertMany([
      // SPECIFICITY mode site-1
      {
        siteId: 'site-1',
        id: 'german-mobile',
        description: 'German mobile users',
        conditions: { country: 'DE', deviceType: 'mobile' },
        variantId: 'german-mobile-hero',
        headline: 'Willkommen – Mobil optimiert',
      },
      {
        siteId: 'site-1',
        id: 'premium-segments',
        description: 'Premium users (requires consent)',
        dataSources: ['segments'],
        conditions: { 'segments.tier': 'premium' },
        variantId: 'premium-variant',
        headline: 'Welcome back, VIP!',
      },
      {
        siteId: 'site-1',
        id: 'fallback',
        description: 'Default fallback',
        conditions: {},
        variantId: 'default',
        headline: 'Welcome',
      },
      // PRIORITY mode site-2
      {
        siteId: 'site-2',
        id: 'priority-high',
        priority: 1,
        conditions: { language: 'fr' },
        variantId: 'french-hero',
        headline: 'Bonjour',
      },
      {
        siteId: 'site-2',
        id: 'priority-low',
        priority: 10,
        conditions: {},
        variantId: 'default',
        headline: 'Hello',
      }
    ]);
  }

  async listRules(siteId: string): Promise<Rule[]> {
    const rules = await this.ruleModel.find({ siteId }).exec();
    return rules.map(r => this.mapToDto(r));
  }

  async getRule(siteId: string, ruleId: string): Promise<Rule> {
    const rule = await this.ruleModel.findOne({ siteId, id: ruleId }).exec();
    if (!rule) {
      throw new NotFoundException(`Rule '${ruleId}' not found for site '${siteId}'`);
    }
    return this.mapToDto(rule);
  }

  async createRule(siteId: string, input: CreateRule): Promise<Rule> {
    const mode = await this.siteService.getRuleEvalMode(siteId);

    if (mode === 'PRIORITY' && typeof input.priority !== 'number') {
      throw new BadRequestException('Priority is required when ruleEvalMode is PRIORITY');
    }

    const existing = await this.ruleModel.findOne({ siteId, id: input.id }).exec();
    if (existing) {
      throw new BadRequestException(`Rule with id '${input.id}' already exists`);
    }

    const rule = new this.ruleModel({
      ...input,
      siteId,
    });

    await rule.save();
    await this.siteService.bumpVersion(siteId);

    return this.mapToDto(rule);
  }

  async updateRule(siteId: string, ruleId: string, input: UpdateRule): Promise<Rule> {
    const rule = await this.ruleModel.findOne({ siteId, id: ruleId }).exec();
    if (!rule) {
      throw new NotFoundException(`Rule '${ruleId}' not found for site '${siteId}'`);
    }

    const mode = await this.siteService.getRuleEvalMode(siteId);
    if (mode === 'PRIORITY' && typeof input.priority !== 'number') {
      throw new BadRequestException('Priority is required when ruleEvalMode is PRIORITY');
    }

    Object.assign(rule, input);
    await rule.save();
    await this.siteService.bumpVersion(siteId);

    return this.mapToDto(rule);
  }

  async deleteRule(siteId: string, ruleId: string): Promise<void> {
    const result = await this.ruleModel.deleteOne({ siteId, id: ruleId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Rule '${ruleId}' not found for site '${siteId}'`);
    }
    await this.siteService.bumpVersion(siteId);
  }

  private mapToDto(doc: RuleDoc): Rule {
    return {
      id: doc.id,
      description: doc.description,
      conditions: doc.conditions,
      dataSources: doc.dataSources,
      variantId: doc.variantId,
      headline: doc.headline,
      flags: doc.flags,
      priority: doc.priority,
    } as Rule;
  }
}
