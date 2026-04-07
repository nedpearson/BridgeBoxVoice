# Change Management Process

**Owner:** CTO  
**Review Cycle:** Annual  
**Effective Date:** March 2026  

---

## 1. Purpose

This document defines how Bridgebox Voice manages, communicates, and deploys changes to the platform to minimize risk and ensure customers are informed and prepared.

---

## 2. Change Categories

| Category | Definition | Notice Required | Approval |
|---|---|---|---|
| **Standard** | Routine low-risk changes (bug fixes, minor UI) | None | PR review |
| **Normal** | Planned changes with moderate risk (new features, config changes) | 7 days (changelog) | Tech lead + QA |
| **Major** | Breaking changes, schema migrations, API changes | 30 days | CTO + affected customers |
| **Emergency** | Critical security patches, SEV-1 fixes | As soon as possible (post-deploy notice within 24h) | CTO (verbal) |

---

## 3. Standard Deployment Pipeline

```
Feature Branch
    ↓
Pull Request (code review by 1+ engineers)
    ↓
CI/CD Pipeline (lint, tsc, unit tests)
    ↓
Staging Environment
    ↓  (QA approval for Normal/Major changes)
Production (canary 5% → 25% → 100%)
    ↓
Monitoring (15 min observation window)
    ↓
Full rollout or automatic rollback
```

### Deployment Windows

| Environment | Deploy Windows | Blackout Periods |
|---|---|---|
| Staging | Any time | None |
| Production (Standard) | Mon–Thu 10am–4pm ET | Fri–Sun, holidays |
| Production (Emergency) | Any time | None |

---

## 4. Customer Communication

### Changelog

All changes are documented in `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com):

```markdown
## [2.1.0] — 2026-04-01

### Added
- Enterprise SAML 2.0 SSO support

### Changed
- API rate limits updated (see docs/api/rate-limits.md)

### Fixed
- Audit log HMAC verification on large payloads

### Deprecated
- `/api/v1/projects/list` — use `/api/v2/projects` instead

### Breaking
- Removed `legacy_token` auth param (deprecated since v1.8)
```

### Communication Channels

| Change Type | In-App Banner | Email | Status Page | Slack |
|---|---|---|---|---|
| Standard | No | No | No | #releases |
| Normal (new features) | Yes (release notes) | Monthly digest | No | #releases |
| Major (breaking) | Yes | Yes — 30 days notice | Yes | #releases + DMs to admins |
| Emergency | Yes | Yes (within 24h) | Yes | #incidents |
| Scheduled maintenance | Yes — 48h before | Yes — 7 days before | Yes | #releases |

### Email Templates

**Major change notification:**
```
Subject: [Action Required] Bridgebox Voice Platform Update — [DATE]

Hi [Name],

We're writing to let you know about an upcoming change to Bridgebox Voice that 
may require action from your team.

What's changing: [Description]
When: [Date and time UTC]
Who's affected: [All users / Enterprise plan / Specific feature users]
Action required: [What customer needs to do]

Documentation: [Link]
Questions: support@bridgebox.ai

The Bridgebox Voice Team
```

---

## 5. Breaking Change Policy

A change is **breaking** if it:
- Removes or renames an API endpoint
- Changes the shape of an API request/response
- Removes a UI feature customers rely on
- Changes authentication mechanisms
- Alters database schema in a backward-incompatible way

For breaking changes:
1. **30-day notice minimum** via email and in-app banner
2. **Deprecation period**: old behavior supported 60 days after breaking version released
3. **Migration guide** published alongside breaking change
4. **Direct outreach** to customers using the affected feature (via analytics)

---

## 6. API Versioning

Bridgebox Voice uses `/v1/`, `/v2/` prefix versioning:
- Old API versions are supported for **12 months** after a new version is released
- Security patches are applied to all active versions
- Sunset notices are sent 90 days before end-of-life

---

## 7. Feature Flags & Gradual Rollouts

New features are rolled out using the feature flag system:

```
0% → 5% (internal testing)
   → 25% (early adopters / beta)
   → 50% (normal rollout)
   → 100% (general availability)
```

Enterprise customers may opt-in early or request exclusion during evaluations.

---

## 8. Rollback Procedure

If a deployment causes elevated error rates:

```bash
# Automatic: Sentry alert fires > 5% error rate increase

# Manual rollback in < 5 minutes:
gcloud run services update-traffic bridgebox-app \
  --to-revisions=[PREV]=100 --region=europe-west1

# Post-rollback notification:
# → Update #incidents Slack channel
# → Post to status page if customer-visible
```

---

## 9. Post-Release Validation Checklist

```
□ Error rate < baseline (Sentry)
□ P95 response time < 500ms
□ Auth success rate > 99.5%
□ Key user flows tested (login, create project, voice record)
□ New feature analytics showing expected engagement
□ No customer support tickets spike
```

---

*Questions: engineering@bridgebox.ai*
