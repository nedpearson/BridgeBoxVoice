# API Rate Limits Documentation

**Version:** 1.0  
**Last Updated:** March 2026  
**Contact:** api@bridgebox.ai  

---

## Rate Limit Tiers

| Plan | Requests/min | Requests/day | Burst | Concurrent |
|---|---|---|---|---|
| **Free** | 20 | 1,000 | 30 | 2 |
| **Starter** ($49/mo) | 100 | 10,000 | 150 | 5 |
| **Pro** ($199/mo) | 500 | 100,000 | 750 | 20 |
| **Business** ($599/mo) | 2,000 | 500,000 | 3,000 | 50 |
| **Enterprise** (custom) | Custom | Unlimited | Custom | Custom |

---

## Response Headers

Every API response includes:

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 483
X-RateLimit-Reset: 1711580460
X-RateLimit-Window: 60
Retry-After: 17        (only on 429 responses)
```

---

## Error Response (HTTP 429)

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit of 500 requests per minute exceeded",
  "retry_after": 17,
  "upgrade_url": "https://bridgebox.ai/pricing"
}
```

---

## Endpoint-Specific Limits

Some endpoints have tighter limits regardless of plan:

| Endpoint | Limit | Window |
|---|---|---|
| `POST /functions/v1/sso-exchange` | 10 req | per minute |
| `POST /auth/v1/token` | 30 req | per 15 minutes |
| `POST /functions/v1/scim/*` | 200 req | per minute |
| `POST /ai/generate` | 60 req | per hour |
| `POST /ai/voice` | 30 req | per hour |
| `GET /functions/v1/stripe/*` | 100 req | per minute |

---

## Best Practices

1. **Cache responses** — Use ETags and `Cache-Control` headers
2. **Exponential backoff** — On 429, wait `retry_after` seconds, then double on repeat failures
3. **Batch requests** — Use bulk endpoints where available
4. **Webhooks over polling** — Subscribe to events instead of polling

### Backoff Example (TypeScript)

```typescript
async function callWithRetry(url: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } })
    if (res.status !== 429) return res
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '1')
    const wait = retryAfter * 1000 * Math.pow(2, i)
    await new Promise(r => setTimeout(r, wait))
  }
  throw new Error('Max retries exceeded')
}
```

---

## Overage Charges

For **Pro** and **Business** plans, overage is available at:

| Metric | Overage Rate |
|---|---|
| Additional API calls | $0.002 per 1,000 calls |
| AI token overage | $0.01 per 1,000 tokens |
| Storage overage | $0.023 per GB/month |

Overage is billed monthly. Set spend alerts in Settings → Billing.

---

## IP-Based Rate Limiting

In addition to key-based limits, individual IP addresses are limited to:
- **Auth endpoints:** 300 req/hour per IP
- **All endpoints (unauthenticated):** 60 req/hour per IP
- **Password reset:** 10 req/hour per IP + per email

---

## SCIM Rate Limits

For IdP provisioning sync (Okta, Azure AD, etc.):

| Operation | Limit |
|---|---|
| Create user | 100/min |
| Update user | 200/min |
| Delete user | 50/min |
| List users | 60/min |

---

## Rate Limit Testing

Use the test endpoint to verify your rate limit tier without consuming quota:

```bash
GET /functions/v1/rate-limit-info
Authorization: Bearer bb_live_xxxx

# Response:
{
  "plan": "pro",
  "requests_remaining": 483,
  "requests_limit": 500,
  "reset_at": "2026-03-27T02:00:00Z",
  "concurrent_limit": 20
}
```

---

## Requesting Higher Limits

Enterprise customers can request custom rate limits. Contact enterprise@bridgebox.ai with:
- Expected peak requests per minute
- Use case description
- Current plan

Response time: 24 hours for Enterprise, 3–5 days for others.
