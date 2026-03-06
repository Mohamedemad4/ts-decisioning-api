# Decisioning API

A lightweight, high-performance decisioning service built with NestJS for consent-safe personalisation.

## Engine Design & Architecture

The core of this API is a deterministic, consent-aware rule engine. To ensure high performance and strict compliance with user tracking preferences, the engine evaluates incoming requests through a strict 4-step pipeline.

### The Execution Pipeline

```text
[ Incoming POST /decide ]
(Traits, Consent, URL)
          |
          v
+---------------------------------------------------+
| 1. CONSENT FILTER                                 |
|---------------------------------------------------|
| If consent.marketing === false:                   |
|  - Strip \`visitorId\` and any non-safe traits.     |
|  - Drop datasources requiring marketing consent.  |
|  - Drop rules relying on unsafe traits/sources.   |
| If consent.marketing === true:                    |
|  - Pass all context through unmodified.           |
+---------------------------------------------------+
          |
          v
+---------------------------------------------------+
| 2. RULE SORTER (Pre-execution)                    |
|---------------------------------------------------|
| Sorts surviving rules purely based on config:     |
|  - Mode: SPECIFICITY (Condition count DESC)       |
|  - Mode: PRIORITY (Explicit integer ASC)          |
|                                                   |
| * Sorting BEFORE async operations ensures we      |
|   don't fetch data for rules that would lose.     |
+---------------------------------------------------+
          |
          v
+---------------------------------------------------+
| 3. DATASOURCE FETCHER                             |
|---------------------------------------------------|
|  - Scan sorted rules for required datasources.    |
|  - Deduplicate datasource requests.               |
|  - Execute in parallel via \`Promise.allSettled\`.  |
|  - Merge async results into the Visitor Context   |
|    using dot-notation (e.g., \`segments.tier\`).    |
+---------------------------------------------------+
          |
          v
+---------------------------------------------------+
| 4. RULE MATCHER (Short-circuit)                   |
|---------------------------------------------------|
|  - Iterate through the sorted rules.              |
|  - Evaluate \`conditions\` vs enriched Context.     |
|  - FIRST MATCH WINS.                              |
|  - Short-circuit and return immediately.          |
+---------------------------------------------------+
          |
          v
[ Output Response ]
{ variantId, headline, flags, configVersion }
```

### Key Design Decisions

1. **Specificty vs Priority:** We support two evaluation modes. `SPECIFICITY` is the safe default, allowing marketers to add rules independently where the most targeted rule naturally wins. `PRIORITY` acts as an escape hatch when a broad rule must explicitly override narrower ones.
2. **Pre-sorting & Lazy Short-circuiting:** By sorting rules *before* evaluating conditions or fetching data, the engine can short-circuit the moment it finds a match. This prevents expensive cascading delays.
3. **Implicit Consent Enforcement:** Rule authors do not need to manually flag rules as "requires consent." The system automatically computes this by inspecting the rule's conditions and required data sources. If a user rejects marketing cookies, non-compliant rules are silently stripped from the execution path before evaluation begins.

---

## Project setup
```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start
```

## Run tests
A simple test suite for the decision engine was created. You may run it using:
```bash
# unit tests
$ pnpm run test
```

## Speed and performance.
The rule engine supports **external** data sources. These data sources are dispatched and evaluated asynchronously with a 250ms cap. 

## Logging & Tracing

All modules use NestJS Logger for structured logging. Key events logged:
- Rule evaluation decisions (DecideModule)
- Config version bumps (RulesModule, SiteModule)
- LLM copy generation attempts and claim validation (CopyAssistantModule)
- Data source fetch results and failures

## Safety & Compliance

The API enforces consent boundaries and claim validation:
- Consent filtering strips non-safe visitor data when `marketing=false`
- Copy Assistant validates all LLM-generated claims against allowed list
- Invalid claim usage triggers retry logic with fallback to safe defaults
- All claim usage is logged for audit trails

## Future improvmenets
Allow the engine to evaluate rules for fetched datasources eagerly as they resolve. As well as caching data sources internally. Unlocking faster performance.
