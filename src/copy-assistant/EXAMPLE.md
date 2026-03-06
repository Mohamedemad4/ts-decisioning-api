# Copy Assistant Usage Example

## Endpoint

```
POST /copy-assistant/generate
```

## Example Request

```json
{
  "visitorData": {
    "country": "DE",
    "language": "de",
    "deviceType": "mobile",
    "tier": "premium"
  },
  "allowedClaims": [
    {
      "id": "claim-free-shipping",
      "text": "Free shipping on all orders over €50"
    },
    {
      "id": "claim-money-back",
      "text": "30-day money-back guarantee"
    },
    {
      "id": "claim-premium-support",
      "text": "24/7 premium customer support"
    }
  ],
  "context": "Homepage hero section for premium mobile users"
}
```

## Example Response

```json
{
  "headline1": "Kostenloser Versand ab €50 – Jetzt bestellen",
  "headline2": "Premium-Support rund um die Uhr für Sie",
  "usedClaimIds": ["claim-free-shipping", "claim-premium-support"],
  "retryCount": 0
}
```

## Safety Features

- LLM can only reference claims from `allowedClaims`
- Server validates all `usedClaimIds` are in the allowed list
- Invalid claims trigger automatic retry (max 1 retry)
- Fallback to generic copy if validation fails after retries
- All attempts logged for audit trail

## Integration with Rules

The generated headlines can be used to create new rules:

1. Admin provides visitor attributes and allowed claims
2. Copy Assistant generates personalized headlines
3. Admin reviews the output and used claims
4. Admin exports to a new rule with the visitor attributes as conditions
