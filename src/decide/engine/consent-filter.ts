import { CONSENT_SAFE_FIELDS, ConsentSafeField } from '../../shared/schemas/visitor.schema';
import { Rule } from '../../rules/rules.schema';
import { DataSourceDefinition } from '../../site/site.schema';

export interface ConsentFilterResult {
  safeTraits: Record<string, any>;
  safeRules: Rule[];
  safeDatasources: DataSourceDefinition[];
}

export function applyConsentFilter(
  marketingConsent: boolean,
  traits: Record<string, any>,
  rules: Rule[],
  datasources: DataSourceDefinition[],
): ConsentFilterResult {
  // If marketing consent is granted, nothing is filtered
  if (marketingConsent) {
    return {
      safeTraits: traits,
      safeRules: rules,
      safeDatasources: datasources,
    };
  }

  // 1. Strip non-safe traits
  const safeTraits: Record<string, any> = {};
  for (const field of CONSENT_SAFE_FIELDS) {
    if (field in traits) {
      safeTraits[field] = traits[field];
    }
  }

  // 2. Filter datasources that require consent
  const safeDatasources = datasources.filter(
    (ds) => !ds.requiresMarketingConsent,
  );
  
  const safeDatasourceIds = new Set(safeDatasources.map((ds) => ds.id));

  // 3. Filter rules
  // A rule is NOT safe if it:
  // - references a trait not in CONSENT_SAFE_FIELDS
  // - depends on a datasource that was filtered out
  const safeRules = rules.filter((rule) => {
    // Check datasources
    if (rule.dataSources?.some((dsId) => !safeDatasourceIds.has(dsId))) {
      return false; // depends on unsafe datasource
    }

    // Check conditions
    for (const key of Object.keys(rule.conditions)) {
      // If the key is mapped to a datasource output (e.g., 'geo.region'), it's safe 
      // as long as the datasource itself was deemed safe above.
      if (key.includes('.')) continue;

      // If it's a direct trait lookup, it MUST be in CONSENT_SAFE_FIELDS
      if (!CONSENT_SAFE_FIELDS.includes(key as ConsentSafeField)) {
        return false; // references unsafe trait
      }
    }

    return true; // safe!
  });

  return { safeTraits, safeRules, safeDatasources };
}
