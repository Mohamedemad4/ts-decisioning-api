# Copy Assistant Module

## Purpose

The Copy Assistant module provides LLM-powered headline generation with claim validation. It enables safe, auditable personalization by ensuring the LLM only uses pre-approved marketing claims when generating copy.

## Flow

1. **Input**: Visitor data (traits) + list of allowed claims (id + text)
2. **LLM Generation**: Mistral AI generates personalized headlines based on visitor context
3. **Tool Call**: LLM declares which claim IDs it used via `usedClaims` tool
4. **Validation**: API validates `usedClaimIds ⊆ allowedClaims`
5. **Retry Logic**: If validation fails, retry once; if still invalid, return fallback
6. **Output**: Generated headlines + used claim IDs for audit trail

## Safety Guarantees

- LLM can only reference claims from the provided `allowedClaims` list
- All used claims are validated server-side before returning to client
- Failed validations are logged and trigger fallback behavior
- Claim usage is tracked for compliance and audit purposes

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/copy-assistant/generate` | Generate personalized headlines with claim validation |

## Request Schema

```json
{
  "visitorData": {
    "country": "DE",
    "language": "de",
    "deviceType": "mobile"
  },
  "allowedClaims": [
    { "id": "claim-1", "text": "Free shipping on orders over €50" },
    { "id": "claim-2", "text": "30-day money-back guarantee" }
  ],
  "context": "Homepage hero section"
}
```

## Response Schema

```json
{
  "headline1": "Kostenloser Versand ab €50",
  "headline2": "30 Tage Geld-zurück-Garantie",
  "usedClaimIds": ["claim-1", "claim-2"],
  "retryCount": 0
}
```

## Integration with Decisioning Engine

The Copy Assistant can be used in the admin UI to generate rule headlines. The workflow:

1. Admin selects visitor attributes (conditions)
2. Admin provides allowed marketing claims
3. Copy Assistant generates personalized headlines
4. Admin reviews and exports to a new rule in the decisioning engine
