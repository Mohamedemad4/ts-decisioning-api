import { DataSourceDefinition } from '../../site/site.schema';
import { DataSourceRegistry } from '../datasources/datasource.registry';

/**
 * Deduplicates and parallel fetches data sources.
 *
 * It maps visitor traits into the required param template of the source,
 * calls the builtin resolver, and returns the flattened results.
 *
 * e.g., if "geo.region" is needed and output is { region: "EMEA" }, it merges
 * that output into the context using dot notation keys.
 */
export async function fetchDatasources(
  registry: DataSourceRegistry,
  definitions: DataSourceDefinition[],
  traits: Record<string, any>,
): Promise<Record<string, any>> {
  // We only fetch built-ins defined in the site config
  const fetchPromises = definitions.map(async (def) => {
    // Lookup built-in
    const builtin = registry.get(def.builtinId);
    if (!builtin) {
      console.warn(`Builtin source '${def.builtinId}' not found in registry`);
      return {};
    }

    // Map context values using params template
    // e.g., params: { "visitorId": "{{visitorId}}" }
    // inputShape validation happens here in real life
    const resolvedParams: Record<string, any> = {};
    for (const [key, template] of Object.entries(def.params)) {
      if (template.startsWith('{{') && template.endsWith('}}')) {
        const traitKey = template.slice(2, -2);
        resolvedParams[key] = traits[traitKey];
      } else {
        // Handle literal values or more complex templating
        resolvedParams[key] = template;
      }
    }

    try {
      // Validate input shape
      const validatedInput = builtin.inputShape.parse(resolvedParams);

      // Fetch async
      const result = await builtin.resolve(validatedInput);

      // Map output to flattened object using def.id prefix
      // Output `{ region: 'EMEA' }` from id 'geo' becomes `{ 'geo.region': 'EMEA' }`
      const merged: Record<string, any> = {};
      for (const [key, value] of Object.entries(result)) {
        merged[`${def.id}.${key}`] = value;
      }

      return merged;
    } catch (e) {
      console.error(`Error resolving data source '${def.builtinId}':`, e);
      return {};
    }
  });

  // Parallel fetch all definitions
  const results = await Promise.allSettled(fetchPromises);

  // Combine into single object to merge with traits
  const finalContext: Record<string, any> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      Object.assign(finalContext, result.value);
    }
  }

  return finalContext;
}
