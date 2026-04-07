# Security Questionnaire — VSAQ Format

**Vendor:** Bridgebox Voice AI, Inc.  
**Product:** Bridgebox Voice Enterprise  
**Date:** March 2026  
**Contact:** security@bridgebox.ai  

> This document follows the **Vendor Security Assessment Questionnaire (VSAQ)** format used by enterprise security teams.

---

## Section 1: Company & Program

| Question | Response |
|---|---|
| Company legal name | Bridgebox Voice AI, Inc. |
| HQ location | United States |
| Year founded | 2025 |
| Number of employees | < 50 |
| Do you have a dedicated security team? | Yes — CISO role + security engineering |
| Do you have a written information security policy? | Yes |
| When was your last third-party security audit? | 2025 (annual cadence) |
| Do you carry cyber liability insurance? | Yes — $2M coverage |
| SOC 2 Type II report available? | In progress (Type I complete) |
| ISO 27001 certified? | In progress |
| GDPR compliant? | Yes — DPA available upon request |
| HIPAA BAA available? | Yes — Enterprise plan |

---

## Section 2: Application Security

| Question | Response |
|---|---|
| Is data encrypted in transit? | Yes — TLS 1.3 minimum |
| Is data encrypted at rest? | Yes — AES-256 (Supabase managed) |
| Do you perform static code analysis (SAST)? | Yes — integrated in CI/CD |
| Do you perform dynamic analysis (DAST)? | Yes — quarterly |
| Do you use dependency vulnerability scanning? | Yes — npm audit + Dependabot |
| How frequently are security patches applied? | Critical: 24h; High: 7 days; Medium: 30 days |
| Do you have a WAF? | Yes — Cloudflare |
| Is multi-factor authentication available? | Yes — TOTP, SMS, WebAuthn |
| Is MFA enforced for admin accounts? | Yes — mandatory |
| Do you support SAML 2.0 SSO? | Yes — Okta, Azure AD, Google, OneLogin |
| Do you support SCIM 2.0? | Yes |
| Is there role-based access control? | Yes — custom RBAC with granular permissions |
| Are sessions time-limited? | Yes — configurable 30 min – 7 days |
| Do you have session invalidation on logout? | Yes |
| Is there API key management? | Yes — scoped, expirable, revocable |
| Do you log all authentication events? | Yes — tamper-proof audit log |

---

## Section 3: Infrastructure

| Question | Response |
|---|---|
| Cloud provider | Supabase (PostgreSQL) on AWS |
| Data center certifications | SOC 2, ISO 27001 (AWS/Supabase) |
| Is infrastructure defined as code (IaC)? | Yes |
| Do you use separate production/staging environments? | Yes |
| Do you have DDoS protection? | Yes — Cloudflare |
| Do you perform regular backups? | Yes — daily automated + point-in-time recovery |
| What is your backup retention period? | 30 days |
| Have you tested backup restoration? | Yes — quarterly |
| Do you have a disaster recovery plan? | Yes (see DR Runbook) |
| What is your RTO? | 4 hours |
| What is your RPO? | 1 hour |
| Do you have a business continuity plan? | Yes |
| Do you use a CDN? | Yes — Cloudflare |

---

## Section 4: Data Handling

| Question | Response |
|---|---|
| Where is customer data stored? | US (default), EU optional |
| Can customers select data residency? | Yes — Enterprise plan |
| Is customer data logically separated? | Yes — Row Level Security (RLS) per tenant |
| Is PII processed? | Yes — email, name, IP address |
| Do you have a data retention policy? | Yes — configurable per tenant |
| Can customers export their data? | Yes — GDPR data export endpoint |
| Can customers delete their data? | Yes — right to erasure supported |
| Do you sell customer data? | No |
| Do you use customer data to train AI models? | No |
| Who are your sub-processors? | Supabase, Anthropic, Stripe, Twilio, Cloudflare, Sentry |
| Is a sub-processor list available? | Yes — in Privacy Policy |
| Do sub-processors have DPAs? | Yes — all listed sub-processors |

---

## Section 5: Access Controls

| Question | Response |
|---|---|
| Is production access limited to authorized personnel? | Yes |
| Is production access logged? | Yes — all access goes through audit log |
| Is privileged access reviewed regularly? | Yes — quarterly access reviews |
| Do employees have unique accounts? | Yes — no shared credentials |
| Is there a formal off-boarding process? | Yes — access revoked within 24 hours |
| Do you use a secrets manager? | Yes — Supabase Vault + env secrets |
| Are secrets rotated regularly? | Yes — API keys 90-day rotation enforced |
| Do you have background checks for employees? | Yes — offer-contingent |

---

## Section 6: Incident Response

| Question | Response |
|---|---|
| Do you have an incident response plan? | Yes — tested annually |
| What is your breach notification SLA? | 72 hours (GDPR), as required by applicable law |
| Do you have a public status page? | Yes — bridgebox.ai/status |
| Have you had a security incident in the last 12 months? | No |
| Do you perform post-mortems after incidents? | Yes — published to customers (redacted) |
| Do you have a vulnerability disclosure program? | Yes — security@bridgebox.ai |

---

## Section 7: Vendor Risk

| Question | Response |
|---|---|
| Do you assess the security of your sub-processors? | Yes — annual review |
| Do you have a vendor management policy? | Yes |
| Do you require sub-processors to be SOC 2 certified? | Yes — preferred, DPA required |

---

## Section 8: Physical Security

| Question | Response |
|---|---|
| Do you operate your own data centers? | No — cloud-only |
| Physical access controls in offices? | Yes — badge access, camera |
| Is a clean desk policy enforced? | Yes |

---

## Certifications & Reports Available on Request

- SOC 2 Type I Report ✅
- SOC 2 Type II (in progress, Q3 2026) 🔄
- Penetration Test Summary (annual) ✅
- GDPR Data Processing Agreement (DPA) ✅
- HIPAA Business Associate Agreement (BAA) ✅ (Enterprise)
- Sub-Processor List ✅

Contact security@bridgebox.ai to request any of the above.
