import { Injectable, NotFoundException } from '@nestjs/common';
import { SiteService } from '../site/site.service';
import { RulesService } from '../rules/rules.service';
import { DataSourceRegistry } from './datasources/datasource.registry';
import { applyConsentFilter } from './engine/consent-filter';
import { sortRules } from './engine/rule-sorter';
import { matchRule } from './engine/rule-matcher';
import { fetchDatasources } from './engine/datasource-fetcher';
import { DecideRequest, DecideResponse } from './decide.schema';

@Injectable()
export class DecideService {
  constructor(
    private readonly siteService: SiteService,
    private readonly rulesService: RulesService,
    private readonly datasourceRegistry: DataSourceRegistry,
  ) {}

  async evaluateRules(request: DecideRequest): Promise<DecideResponse> {
    const { siteId, consent, traits, visitorId } = request;
    
    // Merge traits to allow single context
    const fullContext = {
      ...traits,
      visitorId, // Important for lookups requiring marketing consent
    };

    // 1. LOAD site config + rules
    const site = await this.siteService.getSite(siteId);
    const allRules = await this.rulesService.listRules(siteId);

    // 2. CONSENT FILTER
    const filtered = applyConsentFilter(
      consent.marketing,
      fullContext,
      allRules,
      site.dataSources,
    );
    
    const { safeRules, safeTraits, safeDatasources } = filtered;

    // 3. SORT surviving rules based on mode
    const sortedRules = sortRules(safeRules, site.ruleEvalMode);

    // 4. DEDUPE required data sources from surviving rules
    const requiredDsIds = new Set<string>();
    for (const r of sortedRules) {
      if (r.dataSources) {
        for (const dsId of r.dataSources) {
          requiredDsIds.add(dsId);
        }
      }
    }
    const dsToFetch = safeDatasources.filter((ds) => requiredDsIds.has(ds.id));

    // 5. PARALLEL FETCH data sources
    const dsContext = await fetchDatasources(
      this.datasourceRegistry,
      dsToFetch,
      safeTraits,
    );

    // 6. MERGE context
    const evaluationContext = {
      ...safeTraits,
      ...dsContext,
    };

    // 7. MATCH — iterate sorted rules
    for (const rule of sortedRules) {
      if (matchRule(rule.conditions, evaluationContext)) {
        // First match wins
        return {
          variantId: rule.variantId,
          headline: rule.headline,
          flags: rule.flags,
          configVersion: site.configVersion,
        };
      }
    }

    // No rule matched, should not happen if fallback exists
    throw new NotFoundException(`No matching rule found for site '${siteId}'`);
  }
}
