# DecideModule

The `DecideModule` houses the core rule evaluation engine. It is responsible for taking a visitor's context, fetching any required external data, evaluating the site's ruleset, and returning the winning variant while strictly enforcing consent boundaries.

## Responsibilities
- Serves the `POST /decide` endpoint.
- Serves the `GET /decide/datasources` endpoint (exposing registered built-in blocks for the admin UI).
- Orchestrates the full decisioning pipeline.

## The Engine Pipeline (`src/decide/decide.service.ts`)

When a `/decide` request arrives, the engine executes the following steps in order:

### 1. Consent Filter (`engine/consent-filter.ts`)
The boundary check. If `consent.marketing === false`:
- Drops any trait not listed in `CONSENT_SAFE_FIELDS` (e.g., strips `visitorId`).
- Drops any `DataSourceDefinition` that requires marketing consent.
- Drops any `Rule` that references an unsafe trait or depends on a dropped datasource.
If `consent.marketing === true`, everything passes through.

### 2. Rule Sorter (`engine/rule-sorter.ts`)
Sorts the surviving rules *before* evaluation based on the site's `ruleEvalMode`.
- **`SPECIFICITY` mode:** Primary sort by condition count DESC. Tiebreaker is `priority` ASC.
- **`PRIORITY` mode:** Primary sort by explicit `priority` ASC (enforced by Zod).
- In both modes, the fallback rule (0 conditions) naturally sorts to the bottom.

### 3. Datasource Fetcher (`engine/datasource-fetcher.ts`)
- Collects all unique datasource IDs required by the surviving, sorted rules.
- Fetches them in parallel using `Promise.allSettled`.
- Maps the visitor traits into the datasource parameters based on the site config's param templates.
- Merges the asynchronous results into a flat context object using dot-notation keys (e.g., `{ 'segments.tier': 'premium' }`).

### 4. Rule Matcher (`engine/rule-matcher.ts`)
- Iterates through the sorted rules.
- Uses a `ts-pattern`-inspired approach: a rule matches if *all* its defined conditions strictly equal the values in the merged evaluation context.
- **Short-circuits** and returns the variant immediately upon the first match.

## Data Source Registry (`src/decide/datasources/`)
The engine simulates external lookups (like a CDP or CRM) using "Built-in" data sources.
- `DataSourceRegistry`: A singleton map holding registered `BuiltinDataSource` objects.
- `BuiltinDataSource`: Defines the `inputShape`, `outputShape`, a `requiresMarketingConsent` flag, and the async `resolve` function.
- Current built-ins: `visitor-segments.source.ts` (requires consent) and `geo-enrichment.source.ts` (consent safe).
