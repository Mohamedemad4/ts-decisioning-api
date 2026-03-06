# Decisioning API — Technical Spec

## Purpose

A thin decisioning service for consent-safe personalisation. Given a visitor context, page URL, and consent signals, return the variant they should see. Rules are defined per-site, cacheable, and evaluated using a configurable strategy.

Built with **NestJS**, **Zod** (via `nestjs-zod` for DTO/validation integration), **ts-pattern** for rule condition matching, **MongoDB** (via `@nestjs/mongoose` + Mongoose) for persistence, and **@nestjs/config** for environment-driven configuration.

---

## Architecture

### Modules

Three NestJS feature modules. Each module follows the pattern:

```
src/<module-name>/
  MODULE.md                      # Agent-readable doc explaining the module
  <module-name>.module.ts
  <module-name>.controller.ts
  <module-name>.service.ts
  <module-name>.schema.ts        # Zod schemas (source of truth for API validation)
  <module-name>.entity.ts        # Mongoose schema/model (persistence shape)
  <module-name>.dto.ts           # DTOs generated via createZodDto()
```

| Module | Responsibility |
|---|---|
| `SiteModule` | Site CRUD. List/get sites. Owns the `SiteConfig` entity (siteId, configVersion, ruleEvalMode, dataSources). Persisted to MongoDB `sites` collection. |
| `RulesModule` | Rule CRUD per site. Create/read/update/delete rules within a site. Owns rule schema validation. Persisted to MongoDB `rules` collection. |
| `DecideModule` | The `/decide` endpoint + rule engine. Houses built-in data source registry, consent filtering, rule sorting, rule matching, and the execution engine. Read-only against DB (no writes). |

### Dependency graph

```
DecideModule → RulesModule → SiteModule
                    ↓              ↓
              rules collection   sites collection
                    ↓              ↓
                  MongoDB (single database)
```

- `DecideModule` depends on `RulesModule` to fetch rules for a site.
- `RulesModule` depends on `SiteModule` to validate siteId exists and to read `ruleEvalMode` / `dataSources` config.
- `SiteModule` is standalone.
- Both `SiteModule` and `RulesModule` persist to MongoDB via Mongoose models.

---

## File Structure

```
.env                                      # Environment variables (MONGO_URI, PORT, etc.)
.env.example                              # Template for required env vars

src/
├── main.ts
├── app.module.ts                         # Root module: imports ConfigModule, MongooseModule, feature modules
│
├── shared/
│   ├── schemas/
│   │   ├── visitor.schema.ts             # Visitor traits Zod schema (hardcoded shape, future: dynamic per site)
│   │   ├── consent.schema.ts             # Consent object Zod schema
│   │   └── common.schema.ts              # Shared Zod types (configVersion, siteId, etc.)
│   └── constants/
│       └── consent-safe-fields.ts        # The 4 consent-safe trait fields constant
│
├── site/
│   ├── MODULE.md
│   ├── site.module.ts
│   ├── site.controller.ts                # GET /sites, GET /sites/:siteId, GET /config/:siteId
│   ├── site.service.ts                   # Business logic, delegates to Mongoose model
│   ├── site.entity.ts                    # Mongoose schema + model for `sites` collection
│   ├── site.schema.ts                    # Zod schemas (API validation source of truth)
│   └── site.dto.ts                       # createZodDto() wrappers
│
├── rules/
│   ├── MODULE.md
│   ├── rules.module.ts
│   ├── rules.controller.ts              # CRUD: GET/POST/PUT/DELETE /sites/:siteId/rules
│   ├── rules.service.ts                 # Business logic, delegates to Mongoose model
│   ├── rules.entity.ts                  # Mongoose schema + model for `rules` collection
│   ├── rules.schema.ts                  # Zod schemas (API validation source of truth)
│   └── rules.dto.ts                     # createZodDto() wrappers
│
├── decide/
│   ├── MODULE.md
│   ├── decide.module.ts
│   ├── decide.controller.ts             # POST /decide, GET /decide/datasources
│   ├── decide.service.ts                # Orchestrator: consent filter → sort → fetch → match → return
│   ├── decide.schema.ts                 # Zod: DecideRequest, DecideResponse
│   ├── decide.dto.ts                    # createZodDto() wrappers
│   ├── engine/
│   │   ├── consent-filter.ts            # Strips non-safe traits/rules/datasources based on consent
│   │   ├── rule-sorter.ts               # Sorts rules by SPECIFICITY or PRIORITY mode
│   │   ├── rule-matcher.ts              # ts-pattern-like condition matching against context
│   │   └── datasource-fetcher.ts        # Deduplicates + parallel-fetches built-in data sources
│   └── datasources/
│       ├── datasource.registry.ts       # Map<id, BuiltinDataSource> — registers all built-ins
│       ├── datasource.types.ts          # BuiltinDataSource interface
│       ├── visitor-segments.source.ts   # Built-in: returns { tier, isVip } — requiresMarketingConsent: true
│       └── geo-enrichment.source.ts     # Built-in: returns { region, currency } — requiresMarketingConsent: false
│
test/
├── decide.e2e-spec.ts                   # E2E tests for /decide
└── jest-e2e.json
```

---

## Environment Configuration

All runtime configuration is loaded from `.env` via `@nestjs/config` (`ConfigModule.forRoot()`). No hardcoded connection strings or secrets.

### `.env` variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | yes | — | MongoDB connection string (e.g. `mongodb://localhost:27017/decisioning`) |
| `PORT` | no | `3000` | HTTP server port |

### `.env.example`

```env
MONGO_URI=mongodb://localhost:27017/decisioning
PORT=3000
```

### AppModule wiring

```ts
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),          // loads .env, available everywhere
    MongooseModule.forRoot(process.env.MONGO_URI),     // single DB connection
    SiteModule,
    RulesModule,
    DecideModule,
  ],
})
export class AppModule {}
```

---

## Persistence — MongoDB via Mongoose

### Design principles

1. **Zod owns API validation.** Request/response shapes are defined in `*.schema.ts` (Zod) and enforced via `ZodValidationPipe`.
2. **Mongoose owns persistence.** Document shapes are defined in `*.entity.ts` (Mongoose schemas). These map closely to the Zod shapes but are independent — Mongoose handles DB-level concerns (indexes, defaults, virtuals).
3. **Services bridge both.** Services accept Zod-validated input, interact with Mongoose models, and return plain objects.

### Collections

| Collection | Module | Document shape | Indexed fields |
|---|---|---|---|
| `sites` | SiteModule | `{ siteId, configVersion, ruleEvalMode, dataSources[] }` | `siteId` (unique) |
| `rules` | RulesModule | `{ siteId, id, description?, priority?, conditions, dataSources?, variantId, headline, flags? }` | `siteId` + `id` (compound unique) |

### Mongoose entity pattern

Each entity file exports a Mongoose `Schema` and registers it via `MongooseModule.forFeature()` in the module:

```ts
// site.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'sites' })
export class SiteDocument {
  @Prop({ required: true, unique: true })
  siteId: string;

  @Prop({ required: true })
  configVersion: string;

  @Prop({ required: true, enum: ['PRIORITY', 'SPECIFICITY'] })
  ruleEvalMode: string;

  @Prop({ type: [Object], default: [] })
  dataSources: Record<string, any>[];
}

export const SiteSchema = SchemaFactory.createForClass(SiteDocument);
export type SiteDoc = HydratedDocument<SiteDocument>;
```

```ts
// site.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([{ name: SiteDocument.name, schema: SiteSchema }]),
  ],
  // ...
})
export class SiteModule {}
```

### Seeding

On application startup, `SiteService.onModuleInit()` checks if the `sites` collection is empty. If so, it inserts 2 seed site documents (one SPECIFICITY, one PRIORITY) and their associated seed rules via `RulesService`. This ensures a working demo out of the box while keeping production databases untouched.

---

## Validation Strategy — Zod as Source of Truth

All validation flows through **Zod schemas** using the `nestjs-zod` library:

1. **Define Zod schema** in `*.schema.ts` — this is the canonical definition.
2. **Generate DTO** via `createZodDto(schema)` in `*.dto.ts` — NestJS-compatible class with type inference.
3. **Global `ZodValidationPipe`** — registered in `AppModule`, automatically validates `@Body()`, `@Query()`, `@Param()` against DTOs.
4. **`ZodSerializerInterceptor`** — optionally serializes responses to strip unexpected fields.

```ts
// Example: rules.schema.ts
import { z } from 'zod';

export const CreateRuleSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  conditions: z.record(z.string(), z.string()),
  variantId: z.string(),
  headline: z.string(),
  flags: z.record(z.string(), z.boolean()).optional(),
  dataSources: z.array(z.string()).optional(),     // datasource IDs this rule depends on
  priority: z.number().optional(),
});

// Example: rules.dto.ts
import { createZodDto } from '@anatine/zod-nestjs'; // or nestjs-zod
import { CreateRuleSchema } from './rules.schema';

export class CreateRuleDto extends createZodDto(CreateRuleSchema) {}
```

### AppModule setup

```ts
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';

@Module({
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
```

---

## Endpoints

### SiteModule

| Method | Path | Description |
|---|---|---|
| `GET` | `/sites` | List all sites (id, configVersion, ruleEvalMode) |
| `GET` | `/sites/:siteId` | Get full site config (includes dataSources definition, ruleEvalMode) |

### RulesModule

| Method | Path | Description |
|---|---|---|
| `GET` | `/sites/:siteId/rules` | List all rules for a site |
| `GET` | `/sites/:siteId/rules/:ruleId` | Get a single rule |
| `POST` | `/sites/:siteId/rules` | Create a new rule |
| `PUT` | `/sites/:siteId/rules/:ruleId` | Update a rule |
| `DELETE` | `/sites/:siteId/rules/:ruleId` | Delete a rule |

### DecideModule

| Method | Path | Description |
|---|---|---|
| `POST` | `/decide` | Evaluate rules and return winning variant |

### Config endpoint (SiteModule — cached)

| Method | Path | Description |
|---|---|---|
| `GET` | `/config/:siteId` | Returns full config (site + rules + dataSources) with ETag + Cache-Control |

---

## Schemas

### Visitor (hardcoded shape — future: dynamic per site)

```ts
const VisitorTraitsSchema = z.object({
  country: z.string().optional(),
  language: z.string().optional(),
  deviceType: z.string().optional(),
  referrerDomain: z.string().optional(),
});
```

**Consent-safe fields** (constant):

```ts
const CONSENT_SAFE_FIELDS = ['country', 'language', 'deviceType', 'referrerDomain'] as const;
```

Any trait field or data source output NOT in this list requires marketing consent.

### Consent

```ts
const ConsentSchema = z.object({
  marketing: z.boolean(),
});
```

### Decide Request

```ts
const DecideRequestSchema = z.object({
  siteId: z.string(),
  visitorId: z.string().optional(),
  url: z.string().optional(),
  consent: ConsentSchema,
  traits: VisitorTraitsSchema,
});
```

### Decide Response

```ts
const DecideResponseSchema = z.object({
  variantId: z.string(),
  headline: z.string(),
  flags: z.record(z.string(), z.boolean()).optional(),
  configVersion: z.string(),
});
```

### Site Config — Discriminated Union on `ruleEvalMode`

```ts
const DataSourceRefSchema = z.object({
  id: z.string(),
  params: z.record(z.string(), z.string()).optional(),  // parameter mapping e.g. { "visitorId": "{{visitorId}}" }
});

const BaseRuleFields = {
  id: z.string(),
  description: z.string().optional(),
  conditions: z.record(z.string(), z.string()),
  dataSources: z.array(z.string()).optional(),           // IDs of data sources this rule needs
  variantId: z.string(),
  headline: z.string(),
  flags: z.record(z.string(), z.boolean()).optional(),
};

const PriorityRuleSchema = z.object({
  ...BaseRuleFields,
  priority: z.number(),             // REQUIRED in PRIORITY mode
});

const SpecificityRuleSchema = z.object({
  ...BaseRuleFields,
  priority: z.number().optional(),  // optional tiebreaker in SPECIFICITY mode
});

const DataSourceDefinitionSchema = z.object({
  id: z.string(),
  type: z.literal('BUILTIN'),
  builtinId: z.string(),                          // references a registered built-in async block
  params: z.record(z.string(), z.string()),       // parameter template mapping
  requiresMarketingConsent: z.boolean(),
  cache: z.boolean().default(false),
});

const SiteConfigSchema = z.discriminatedUnion('ruleEvalMode', [
  z.object({
    siteId: z.string(),
    configVersion: z.string(),
    ruleEvalMode: z.literal('PRIORITY'),
    dataSources: z.array(DataSourceDefinitionSchema).default([]),
    rules: z.array(PriorityRuleSchema),
  }),
  z.object({
    siteId: z.string(),
    configVersion: z.string(),
    ruleEvalMode: z.literal('SPECIFICITY'),
    dataSources: z.array(DataSourceDefinitionSchema).default([]),
    rules: z.array(SpecificityRuleSchema),
  }),
]);
```

---

## Data Sources — Built-in Async Blocks

### What they are

In-process async functions registered by ID. They simulate external lookups (CRM, CDP, billing, etc.) but run in-process. They are `async` because in production they would do real I/O — keeping them async now ensures the engine design is honest.

### Registration

Built-in data sources are registered in `datasource.registry.ts`:

```ts
interface BuiltinDataSource {
  id: string;
  requiresMarketingConsent: boolean;
  inputShape: z.ZodObject<any>;                 // Zod schema for input validation
  outputShape: z.ZodObject<any>;                // Zod schema for output shape
  resolve: (input: Record<string, any>) => Promise<Record<string, any>>;
}
```

### Seed built-ins

| ID | Consent Required | Input | Output | Purpose |
|---|---|---|---|---|
| `visitor-segments` | `true` | `{ visitorId }` | `{ tier, isVip }` | Simulates CRM/CDP segment lookup |
| `geo-enrichment` | `false` | `{ country }` | `{ region, currency }` | Enriches country → region + currency |

### How data sources attach to rules

A site config declares which data sources are available (in `dataSources[]`). Each rule optionally references data source IDs it depends on (in `dataSources[]` on the rule). The parameter mapping on the site-level definition defines how visitor context maps to data source inputs.

```json
{
  "siteId": "site-1",
  "dataSources": [
    {
      "id": "segments",
      "type": "BUILTIN",
      "builtinId": "visitor-segments",
      "params": { "visitorId": "{{visitorId}}" },
      "requiresMarketingConsent": true,
      "cache": false
    }
  ],
  "rules": [
    {
      "id": "rule-1",
      "dataSources": ["segments"],
      "conditions": { "segments.tier": "premium", "country": "DE" },
      "variantId": "premium-de",
      "headline": "Willkommen, Premium"
    }
  ]
}
```

### Consent auto-derivation on rules

A rule's `requiresMarketingConsent` is **not stored** — it is **computed** at runtime (and surfaced to the frontend):

```
requiresMarketingConsent(rule) =
  rule.dataSources references a datasource where requiresMarketingConsent === true
  OR
  rule.conditions references a field NOT in CONSENT_SAFE_FIELDS
```

The frontend/admin UI can display this as a computed badge per rule.

---

## Rule Evaluation — Execution Flow

### Full `/decide` pipeline

```
1.  VALIDATE request body (Zod via ZodValidationPipe)
2.  LOAD site config (SiteService) + rules (RulesService)
3.  CONSENT FILTER
    a. If marketing === false:
       - Drop datasources where requiresMarketingConsent === true
       - Drop rules where computed requiresMarketingConsent === true
       - Strip visitorId and non-safe traits from context
4.  SORT surviving rules
    - SPECIFICITY: conditions count DESC → priority ASC (tiebreaker) → array order
    - PRIORITY:    priority ASC → array order
5.  FLATTEN + DEDUPLICATE datasource IDs from surviving rules
6.  FETCH all datasources in parallel (Promise.allSettled)
    - Each built-in's resolve() is called with mapped params
    - Results keyed by datasource ID
7.  MERGE datasource outputs into evaluation context
    - Context = consent-filtered traits + datasource results (namespaced by datasource ID)
    - e.g. { country: "DE", "segments.tier": "premium", "segments.isVip": true }
8.  MATCH — iterate sorted rules, first match wins
    - A rule matches when ALL its conditions are satisfied against the merged context
    - ts-pattern-like matching: exact string equality per condition key-value pair
9.  RETURN { variantId, headline, flags, configVersion }
    - If no rule matches (shouldn't happen if fallback exists): 404
```

### Rule sorting — pre-execution

Rules are sorted **before** any evaluation or data fetching. Sorting is pure and sync.

| Mode | Primary Sort | Tiebreaker | `priority` field |
|---|---|---|---|
| `SPECIFICITY` | `Object.keys(conditions).length` DESC | `priority` ASC (if set, else `Infinity`) → array order | **optional** |
| `PRIORITY` | `priority` ASC | array order | **required** (Zod-enforced) |

Fallback rule (`conditions: {}`) has specificity 0 and naturally sorts last in both modes.

### Condition matching — ts-pattern-like

Conditions are `Record<string, string>`. Matching is:

```ts
function matchRule(conditions: Record<string, string>, context: Record<string, any>): boolean {
  return Object.entries(conditions).every(
    ([key, value]) => context[key] === value
  );
}
```

Empty conditions (`{}`) always match — this is the fallback. Future: support operators (gt, lt, contains, regex) via a pattern DSL.

---

## Caching Strategy

### `/config/:siteId` response headers

| Header | Example | Purpose |
|---|---|---|
| `ETag` | `"v3"` | Tied to `configVersion`, enables `304` responses |
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | CDN/edge/origin caching |

Returns `304 Not Modified` when request `If-None-Match` matches current ETag.

### CDN/Edge/Origin caching layers

| Layer | Mechanism | Behaviour |
|---|---|---|
| CDN | `Cache-Control: public, max-age` | Serve stale config for up to `max-age` seconds |
| Edge | `stale-while-revalidate` | Serve stale while revalidating in background |
| Origin | `ETag` / `If-None-Match` | Return `304` when config hasn't changed |

`configVersion` appears in both `/config` and `/decide` responses for client-side consistency checks.

---

## Frontend Support — API Surface

The API is designed to support an admin frontend. Key endpoints for the frontend:

| Purpose | Endpoint | Notes |
|---|---|---|
| List sites | `GET /sites` | Dropdown/selector |
| Site detail | `GET /sites/:siteId` | Shows ruleEvalMode, dataSources, configVersion |
| List rules | `GET /sites/:siteId/rules` | Rule list view, each rule shows computed consent requirement |
| CRUD rules | `POST/PUT/DELETE /sites/:siteId/rules` | Admin creates/edits rules |
| List built-in blocks | `GET /decide/datasources` | Returns registered built-in data source IDs + their input/output shapes + consent flags |
| Preview decide | `POST /decide` | Admin previews with preset visitor profiles |
| Cached config | `GET /config/:siteId` | Full config for frontend consumption / CDN caching |

### Built-in blocks listing

The `GET /decide/datasources` endpoint returns all registered built-in data sources so the admin UI can show them as available "blocks" when creating rules:

```json
[
  {
    "id": "visitor-segments",
    "requiresMarketingConsent": true,
    "inputShape": { "visitorId": "string" },
    "outputShape": { "tier": "string", "isVip": "boolean" }
  },
  {
    "id": "geo-enrichment",
    "requiresMarketingConsent": false,
    "inputShape": { "country": "string" },
    "outputShape": { "region": "string", "currency": "string" }
  }
]
```

---

## Tests

### Required

1. **Rule match (SPECIFICITY)** — config with 3 rules at varying specificity. Visitor matches the most specific rule. Verify correct variant returned.
2. **Consent boundary** — same config. `marketing=false`. A rule depending on `visitor-segments` (consent-required datasource) is skipped. A consent-safe rule wins instead.

### Bonus

3. **PRIORITY mode** — verify explicit priority ordering overrides natural specificity.
4. **Datasource deduplication** — two rules reference the same datasource. Verify it's fetched only once.

---

## Implementation Scope

### In scope (build now)

- Three NestJS modules: SiteModule, RulesModule, DecideModule
- Zod schemas as source of truth for API validation, DTOs via `nestjs-zod`
- MongoDB persistence via `@nestjs/mongoose` + Mongoose (sites + rules collections)
- `.env` file for configuration (`MONGO_URI`, `PORT`) via `@nestjs/config`
- Seed data on startup (2 sites, demo rules) — only when collections are empty
- 2 built-in async data sources (visitor-segments, geo-enrichment)
- Full `/decide` pipeline: consent filter → sort → fetch → match → return
- ETag + Cache-Control on `/config/:siteId`
- Rule CRUD endpoints with full Zod validation
- 2+ tests

### Out of scope (design only)

- HTTP data sources (schema supports `type: 'BUILTIN'` only for now)
- Data source result caching (`cache` flag exists in schema but not implemented)
- Dynamic visitor schema per site (hardcoded for now)
- Performance estimate endpoint
- Eager-yield streaming model (all sources resolve via `Promise.allSettled` before evaluation)
- Tier timeout
- Advanced condition operators (gt, lt, regex, contains)

---

## Stubs to Create

On initial scaffolding, create the following files as minimal stubs with TODO comments:

### Shared

- `src/shared/schemas/visitor.schema.ts` — export `VisitorTraitsSchema`, `CONSENT_SAFE_FIELDS`
- `src/shared/schemas/consent.schema.ts` — export `ConsentSchema`
- `src/shared/schemas/common.schema.ts` — shared string types

### SiteModule

- `src/site/MODULE.md`
- `src/site/site.module.ts` — NestJS module declaration
- `src/site/site.controller.ts` — `GET /sites`, `GET /sites/:siteId`, `GET /config/:siteId`
- `src/site/site.service.ts` — in-memory Map store, seed 2 sites
- `src/site/site.schema.ts` — `SiteConfigSchema` discriminated union, `DataSourceDefinitionSchema`
- `src/site/site.dto.ts` — DTOs via `createZodDto()`

### RulesModule

- `src/rules/MODULE.md`
- `src/rules/rules.module.ts` — NestJS module, imports SiteModule
- `src/rules/rules.controller.ts` — CRUD endpoints under `/sites/:siteId/rules`
- `src/rules/rules.service.ts` — rule storage per site, validation against ruleEvalMode
- `src/rules/rules.schema.ts` — `PriorityRuleSchema`, `SpecificityRuleSchema`, `CreateRuleSchema`, `UpdateRuleSchema`
- `src/rules/rules.dto.ts` — DTOs

### DecideModule

- `src/decide/MODULE.md`
- `src/decide/decide.module.ts` — NestJS module, imports RulesModule
- `src/decide/decide.controller.ts` — `POST /decide`, `GET /decide/datasources`
- `src/decide/decide.service.ts` — orchestrator
- `src/decide/decide.schema.ts` — `DecideRequestSchema`, `DecideResponseSchema`
- `src/decide/decide.dto.ts` — DTOs
- `src/decide/engine/consent-filter.ts` — consent filtering logic
- `src/decide/engine/rule-sorter.ts` — sort by SPECIFICITY or PRIORITY
- `src/decide/engine/rule-matcher.ts` — ts-pattern-like condition evaluation
- `src/decide/engine/datasource-fetcher.ts` — deduplicate + parallel fetch
- `src/decide/datasources/datasource.registry.ts` — built-in registry
- `src/decide/datasources/datasource.types.ts` — `BuiltinDataSource` interface
- `src/decide/datasources/visitor-segments.source.ts` — mock segment lookup
- `src/decide/datasources/geo-enrichment.source.ts` — mock geo enrichment
