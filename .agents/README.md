# Decisioning API — Agent Guide

Welcome, Agent. You are operating within the `decisioning-api` NestJS backend. This document serves as your entry point for understanding the architecture, constraints, and operational patterns of this codebase.

## Core Directives

1. **Zod is the Source of Truth:** All API request/response validation is defined using `zod` schemas located in `*.schema.ts` files. We use `nestjs-zod` to generate DTOs and power global validation via `ZodValidationPipe`. Do NOT use `class-validator`.
2. **MongoDB for Persistence:** The application uses `@nestjs/mongoose` to store data. Entity shapes are defined in `*.entity.ts` files. The database schema (Mongoose) is strictly separated from the API validation schema (Zod).
3. **Module-Driven Architecture:** The codebase is split into feature modules. Each module contains a `MODULE.md` file that explains its specific responsibilities and mechanics. **You must read the relevant `MODULE.md` before modifying a module.**

## Navigation Guide

Start by reading the global `SPEC.md` in the root of the API repository for a high-level overview of the decisioning engine and consent boundaries.

Then, consult the specific module documentation based on your task:

### `src/site/`
Read `src/site/MODULE.md`.
Handles `SiteConfig` CRUD, including the `ruleEvalMode` (`SPECIFICITY` vs `PRIORITY`), data source definitions, and caching headers (`ETag`, `Cache-Control`) for the `/config/:siteId` endpoint.

### `src/rules/`
Read `src/rules/MODULE.md`.
Handles Rule CRUD per site. Enforces the relationship between a rule's shape and its parent site's `ruleEvalMode` (e.g., `priority` is required in `PRIORITY` mode). Bumps the parent site's `configVersion` on mutation.

### `src/decide/`
Read `src/decide/MODULE.md`.
The core decisioning engine. Evaluates visitor context against a site's ruleset. Handles consent filtering, rule sorting, async data source fetching, and condition matching.

## Key Technical Patterns

- **Consent Filtering:** When `marketing=false`, the engine aggressively strips `visitorId`, non-safe traits, and any rules/datasources that depend on them. See `src/shared/schemas/visitor.schema.ts` for `CONSENT_SAFE_FIELDS`.
- **Pre-sorting:** Rules are sorted *before* evaluation to allow short-circuiting.
- **Built-in Async Blocks:** The engine simulates external API calls using registered in-memory async functions (`src/decide/datasources/`).
- **Seeding:** Both `SiteService` and `RulesService` use `onModuleInit` to automatically seed demo data if their respective collections are empty.