# SiteModule

Manages site-level configurations (`SiteConfig`).

## Responsibilities
- CRUD operations for sites.
- Acts as the source of truth for the `ruleEvalMode` (`SPECIFICITY` vs `PRIORITY`).
- Owns `dataSources` schema which maps site context fields into the data sources parameters.
- Caches the `/config/:siteId` rulesets using `ETag` matching `configVersion`.

## Persistence
Stores sites in MongoDB `sites` collection with unique `siteId` index.
