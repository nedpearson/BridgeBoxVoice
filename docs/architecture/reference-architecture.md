# Reference Architecture

**Version:** 1.0  
**Last Updated:** March 2026  
**Classification:** Internal / Shared with Enterprise prospects under NDA  

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                       │
│                                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│   │  Web App     │  │Chrome Extension│  │  Mobile (upcoming)       │ │
│   │ React + Vite │  │ Manifest V3  │  │  React Native            │ │
│   └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘ │
└──────────┼──────────────────┼────────────────────────┼──────────────┘
           │                  │                        │
           ▼                  ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE EDGE                                  │
│   CDN (static assets)  |  WAF  |  DDoS Protection  |  Rate Limiting │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌─────────────────────────┐       ┌──────────────────────────┐
│   SUPABASE PLATFORM      │       │   GOOGLE CLOUD RUN       │
│                          │       │                          │
│  ┌─────────────────────┐ │       │  ┌────────────────────┐  │
│  │   Auth (GoTrue)     │ │       │  │  Node.js Services  │  │
│  │   - Email/Password  │ │       │  │  - Hot reload srv  │  │
│  │   - Magic Links     │ │       │  │  - Webhook handler │  │
│  │   - SSO / SAML      │ │       │  └────────────────────┘  │
│  └─────────────────────┘ │       └──────────────────────────┘
│                          │
│  ┌─────────────────────┐ │
│  │  Postgres (Primary) │ │
│  │  - Multi-tenant RLS │ │
│  │  - 40+ tables       │ │
│  │  - PITR backups     │ │
│  └─────────────────────┘ │
│                          │
│  ┌─────────────────────┐ │
│  │  Edge Functions     │ │
│  │  (Deno runtime)     │ │
│  │  - sso-exchange     │ │
│  │  - scim             │ │
│  │  - stripe           │ │
│  │  - twilio           │ │
│  │  - audit-sign       │ │
│  │  - gdpr-export      │ │
│  │  - backup-trigger   │ │
│  └─────────────────────┘ │
│                          │
│  ┌─────────────────────┐ │
│  │  Realtime           │ │
│  │  (WebSocket)        │ │
│  └─────────────────────┘ │
│                          │
│  ┌─────────────────────┐ │
│  │  Storage (S3-compat)│ │
│  │  - Voice recordings │ │
│  │  - Document uploads │ │
│  │  - Project assets   │ │
│  └─────────────────────┘ │
└──────────────────────────┘
           │
           │ External APIs
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   THIRD-PARTY INTEGRATIONS                            │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Anthropic │  │  Stripe  │  │  Twilio  │  │  Slack   │            │
│  │ Claude   │  │ Billing  │  │SMS/Voice │  │Integration│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │QuickBooks│  │ SendGrid │  │  Sentry  │  │  Intercom│            │
│  │ QBO API  │  │  Email   │  │ Errors   │  │  Support │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow — Voice-to-Software Pipeline

```
User speaks
    │
    ▼
Chrome Extension (MediaRecorder API)
    │ PCM audio blob
    ▼
Supabase Storage (temp upload)
    │ signed URL
    ▼
Edge Function: voice-process
    │ forwards to
    ▼
Anthropic Claude (transcription + analysis)
    │ structured JSON
    ▼
Supabase Database
    │ project, tasks, captures saved
    ▼
Realtime subscription → Web App UI updates live
    │
    ▼
Audit Log created (HMAC-signed)
```

---

## 3. Authentication & Authorization Flow

```
User Login Request
    │
    ├─► Password? ──► Supabase Auth (GoTrue) ──► JWT issued
    │
    ├─► Magic Link? ──► Email sent ──► Click ──► JWT issued
    │
    └─► SSO? ──► Redirect to IdP (Okta / Azure AD)
                    │
                    ▼
              IdP authenticates
                    │ SAML Assertion POST
                    ▼
              Edge Fn: sso-exchange
                    │ JIT provision if needed
                    ▼
              Supabase Auth user created/updated
                    │
                    ▼
              JWT issued ──► App session

JWT payload:
  { sub, email, workspace_id, role, iat, exp }

Every DB query uses RLS:
  auth.uid() = user_id AND workspace_id = current_setting('app.workspace_id')
```

---

## 4. Multi-Tenant Isolation Model

```
Global
└── Workspaces (tenant boundary)
    ├── workspace_members (user → workspace → role)
    ├── projects
    ├── captures
    ├── sso_configs
    ├── custom_roles
    ├── audit_logs
    ├── feature_flags
    ├── api_keys
    └── tenant_branding

Each table has:
  ALTER TABLE [t] ENABLE ROW LEVEL SECURITY;
  CREATE POLICY ... USING (workspace_id = auth.jwt()->>'workspace_id');
```

---

## 5. Network Topology

```
Internet
    │
    ▼
Cloudflare (DNS, WAF, CDN)
    │
    ├──► Static Assets (CDN edge cache — no origin hit)
    │
    └──► API / App requests
              │
              ▼
         Supabase (us-east-1)
              │
              ├──► Auth endpoint      :5000
              ├──► REST API           :5000/rest/v1
              ├──► Realtime           :5000/realtime/v1
              ├──► Storage            :5000/storage/v1
              └──► Edge Functions     :5000/functions/v1
```

---

## 6. Security Controls Summary

| Layer | Control |
|---|---|
| Network | Cloudflare WAF, DDoS, TLS 1.3 |
| Application | OWASP Top 10 mitigations, CSP headers |
| Authentication | JWT + refresh tokens, MFA, SSO |
| Authorization | RBAC + ABAC + RLS (DB-enforced) |
| Data at rest | AES-256 (Supabase managed) |
| Data in transit | TLS 1.3 minimum |
| Audit | HMAC-signed immutable audit log |
| Secrets | Supabase Vault + env secrets |
| Dependencies | Dependabot + npm audit in CI |
| Monitoring | Sentry, Supabase logs, status page |

---

## 7. Scalability Architecture

```
Current (Startup):
  Single Supabase project
  Direct DB connections via PostgREST
  No caching layer

Phase 9 Target (Scale):
  + Upstash Redis (API response cache, session cache)
  + Supabase Read Replicas (analytics queries)
  + Cloudflare KV (feature flag cache at edge)
  + Auto-scaling Edge Functions (Deno isolates, built-in)
```

---

## 8. Backup & Recovery Architecture

```
Production DB
    │
    ├──► Continuous WAL streaming (Supabase PITR — 7 day window)
    │
    ├──► Daily full backup (Supabase managed, 30 day retention)
    │
    └──► Weekly export to S3 (cross-region, 1 year retention)
              │
              ▼
         Backup Supabase project (standby, same schema)
              │
              ▼
         DR activation: DNS update → failover in < 4 hours
```

---

*For a full network diagram with IP ranges and firewall rules, contact engineering@bridgebox.ai (available under NDA).*
