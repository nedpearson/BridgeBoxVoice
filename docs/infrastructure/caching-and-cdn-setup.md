# Upstash Redis + Cloudflare CDN Setup Guide

**Phase 9 — Scale & Performance**  
**Owner:** Engineering  
**Last Updated:** March 2026

---

## Part 1: Upstash Redis Caching

Upstash provides serverless Redis that integrates directly with Supabase Edge Functions.

### Why Redis?
- Cache feature flag evaluations (eliminates 1 DB query per request)
- Cache API rate limit counters (atomic, fast)
- Cache AI model responses for identical prompts (reduces Anthropic API costs)
- Session data for faster auth lookups

### Setup

**Step 1: Create Upstash account**
1. Go to console.upstash.com
2. Sign up with nedpearson@gmail.com
3. Click **Create Database**
4. Settings: Name=`bridgebox-prod`, Region=`US-East-1`, Type=`Regional`
5. Click **Create**

**Step 2: Get credentials**
```
From Upstash dashboard → Database → Details:
  REST URL:   https://xxx.upstash.io
  REST Token: AXXXxx...
```

**Step 3: Add to Supabase secrets**
```bash
npx supabase secrets set UPSTASH_REDIS_REST_URL="https://xxx.upstash.io" \
  --project-ref xuplmlfnhdtkqwbgplop

npx supabase secrets set UPSTASH_REDIS_REST_TOKEN="AXXXxx..." \
  --project-ref xuplmlfnhdtkqwbgplop
```

**Step 4: Add to `.env`**
```
VITE_UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=AXXXxx...
```

### Usage in Edge Functions

```typescript
// utils/redis.ts
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')!
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!

export async function redisGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  })
  const { result } = await res.json()
  return result ? JSON.parse(result) : null
}

export async function redisSet(key: string, value: unknown, ttlSeconds = 60) {
  await fetch(`${REDIS_URL}/set/${key}/${JSON.stringify(value)}/EX/${ttlSeconds}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  })
}

// Example: Cache feature flags for 60 seconds
export async function getCachedFlags(workspaceId: string) {
  const cacheKey = `flags:${workspaceId}`
  const cached = await redisGet(cacheKey)
  if (cached) return cached

  const flags = await supabase.from('feature_flags').select('*').eq('workspace_id', workspaceId)
  await redisSet(cacheKey, flags.data, 60)
  return flags.data
}
```

### Caching Strategy

| Data | TTL | Cache Key Pattern |
|---|---|---|
| Feature flags | 60s | `flags:{workspace_id}` |
| Rate limit counters | 60s | `rate:{user_id}:{minute}` |
| AI prompt responses | 3600s | `ai:{sha256(prompt)}` |
| SSO configs | 300s | `sso:{workspace_id}` |
| User session | 900s | `session:{token_hash}` |

### Cost Estimate
- Free tier: 10,000 commands/day
- Pay-as-you-go: $0.20 / 100,000 commands
- Expected usage at launch: ~50,000 commands/day = ~$3/month

---

## Part 2: Cloudflare CDN Setup

### What Cloudflare handles
- Static asset CDN (JS/CSS/images cached at edge globally)
- DDoS protection (Layer 3/4/7)
- Web Application Firewall (WAF)
- SSL/TLS termination
- Rate limiting (Layer 7)

### Setup

**Step 1: Add site to Cloudflare**
1. Go to dash.cloudflare.com → Add a site
2. Enter: `bridgebox.ai`
3. Select plan: **Pro** ($20/month) — needed for WAF + Page Rules
4. Copy the two Cloudflare nameservers shown

**Step 2: Update DNS nameservers** (at your domain registrar)
```
ns1.cloudflare.com
ns2.cloudflare.com
```
Wait 24-48 hours for propagation.

**Step 3: DNS records to move to Cloudflare**
```
Type  Name                Value                         Proxy
A     bridgebox.ai        [origin IP]                   ✅ Proxied
CNAME app.bridgebox.ai    [cloud run URL]               ✅ Proxied
CNAME api.bridgebox.ai    xuplmlfnhdtkqwbgplop.supabase.co  ✅ Proxied
TXT   _dmarc             "v=DMARC1; p=reject; ..."      ☐ DNS only
```

**Step 4: Cloudflare Page Rules**
```
URL: app.bridgebox.ai/assets/*
Setting: Cache Level = Cache Everything
Edge TTL: 1 month

URL: app.bridgebox.ai/api/*
Setting: Cache Level = Bypass

URL: app.bridgebox.ai/*
Setting: SSL = Full (Strict)
```

**Step 5: WAF Rules**
```
Rule: Block SQL injection
  Expression: cf.threat_score > 14
  Action: Block

Rule: Rate limit auth endpoints  
  URL: */auth/v1/*
  Rate: 30 req / 5 min / IP
  Action: Block for 1 hour

Rule: Allow Supabase IPs
  IP: 52.0.0.0/8 (AWS us-east-1)
  Action: Bypass WAF
```

**Step 6: Verify**
```bash
# Check CDN is active
curl -I https://app.bridgebox.ai | grep -i "cf-cache-status"
# Expected: CF-Cache-Status: HIT (on second request)

# Check SSL
curl -I https://app.bridgebox.ai | grep -i "strict-transport-security"
```

### Performance Targets After CDN
| Metric | Before | After |
|---|---|---|
| Time to First Byte | ~400ms | ~50ms (cached) |
| JS bundle load | ~800ms | ~120ms |
| Global P95 latency | ~600ms | ~80ms |
| DDoS threshold | None | 1Tbps protected |

---

*Questions: engineering@bridgebox.ai*
