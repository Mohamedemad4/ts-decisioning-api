# RulesModule

Handles CRUD operations for rules within a specific site.

## Responsibilities
- Rule storage, updates, deletion.
- Validates that `priority` is present when the site is set to `PRIORITY` eval mode.
- Bumps the parent site's `configVersion` upon modifications (via `SiteService.bumpVersion()`).

## Validation
Fully validated by `nestjs-zod`.
`RuleId` and `SiteId` uniqueness is enforced by MongoDB compound unique indexes.
