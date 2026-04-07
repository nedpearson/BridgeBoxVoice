# Data Classification Policy

**Document Owner:** CTO / Data Protection Officer  
**Effective Date:** March 2026  
**Review Cycle:** Annual  
**Classification:** Public  

---

## 1. Purpose

This policy establishes how Bridgebox Voice classifies and handles different categories of data to ensure appropriate protection, regulatory compliance, and consistent data governance across all systems and tenants.

---

## 2. Data Classification Levels

### Level 1 — Public

> Data that can be freely shared without restriction.

**Examples:**
- Marketing materials, blog posts
- Product documentation
- Status page incident history
- Aggregated, anonymized analytics

**Controls Required:** None beyond standard web security

---

### Level 2 — Internal

> Data intended for internal use only; not for external distribution.

**Examples:**
- Internal team communications
- Architecture diagrams
- Non-sensitive business metrics
- Employee directory

**Controls Required:**
- Access limited to authenticated employees
- Not indexed by search engines
- Cannot be shared via public links

---

### Level 3 — Confidential

> Sensitive business data that could harm Bridgebox Voice or customers if disclosed.

**Examples:**
- Customer workspace data
- Source code and proprietary algorithms
- Unpublished financial data
- Security assessments

**Controls Required:**
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Access limited to authorized roles
- Audit logging of all access
- Cannot be copied to personal devices

---

### Level 4 — Restricted (PII / PHI / PCI)

> Highly sensitive data subject to regulatory requirements.

**Examples:**
- Personally Identifiable Information (PII): names, emails, phone numbers
- Protected Health Information (PHI): any health-related data
- Payment Card Data (PCI): card numbers, CVVs
- Authentication credentials (passwords, API keys, tokens)
- Biometric data

**Controls Required:**
- Encryption at rest and in transit (mandatory)
- Strict access controls — minimum necessary access principle
- Full audit trail for every access
- Data residency controls enforced
- Cannot leave designated geographic region
- Immediate breach notification if compromised
- Automated PII detection before processing

---

## 3. Data Labeling

All data stored in the platform is automatically classified based on the `data_classification_rules` table. Fields containing PII are tagged at ingestion.

| Field Type | Auto-Classification |
|---|---|
| email | Level 4 (PII) |
| phone_number | Level 4 (PII) |
| ip_address | Level 4 (PII) |
| full_name | Level 4 (PII) |
| ssn, dob | Level 4 (PII) |
| voice_recording | Level 4 (PII/Biometric) |
| credit_card | Level 4 (PCI) |
| workspace_data | Level 3 (Confidential) |
| audit_logs | Level 3 (Confidential) |
| platform_metrics | Level 2 (Internal) |

---

## 4. Tenant Data Handling

Each tenant's data is:
- **Isolated** via Row Level Security (RLS) in PostgreSQL
- **Encrypted** at the database level
- **Retained** for the duration of the contract + 30 days
- **Deleted** within 30 days of account termination (on request)
- **Exportable** via GDPR data export endpoint

---

## 5. Data Residency

Tenants on Enterprise plan may designate a data region:
- `us-east-1` (Virginia) — default
- `eu-west-1` (Ireland) — GDPR-preferred
- `ap-southeast-1` (Singapore)

Data residency configuration is enforced at the Supabase project level.

---

## 6. Third-Party Data Sharing

Bridgebox Voice shares Level 3/4 data with the following sub-processors:

| Sub-Processor | Purpose | Location | DPA Signed |
|---|---|---|---|
| Supabase | Database & Auth | US/EU | ✅ |
| Anthropic | AI processing | US | ✅ |
| Stripe | Payment processing | US | ✅ |
| Twilio | SMS/Voice | US | ✅ |
| Sentry | Error logging | US | ✅ |
| Cloudflare | CDN/DDoS | Global | ✅ |

No sub-processor receives data beyond what is necessary for their stated purpose.

---

## 7. Data Retention Schedule

| Data Type | Retention Period | Deletion Method |
|---|---|---|
| User account data | Contract + 30 days | Secure erase |
| Audit logs | 7 years (regulatory) | Archived, then deleted |
| Voice recordings | 90 days (default) | Overwrite with zeros |
| Payment records | 7 years (financial) | Archived |
| Support tickets | 3 years | Secure erase |
| Analytics (aggregated) | Indefinite | N/A |
| Error logs (Sentry) | 90 days | Auto-purged |

---

## 8. Violations

Violations of this policy may result in:
- Access revocation
- Employment action
- Customer contract termination
- Regulatory notification

Report suspected violations to security@bridgebox.ai

---

*This policy was last reviewed by legal counsel in March 2026.*
