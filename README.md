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
