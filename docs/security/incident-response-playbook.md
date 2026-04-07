# Incident Response Playbook

**Classification:** Internal Confidential  
**Owner:** CTO / Head of Engineering  
**Review Cycle:** Quarterly  
**Last Updated:** March 2026  

---

## 1. On-Call Contacts

| Role | Primary | Backup | Phone | Slack |
|---|---|---|---|---|
| Incident Commander | | | | |
| Security Lead | | | | |
| Database Admin | | | | |
| Frontend Lead | | | | |
| Customer Success | | | | |
| Legal / DPO | | | | |
| PR / Comms | | | | |

**Escalation Order:** On-Call Eng → Security Lead → CTO → CEO

---

## 2. Severity Classifications

| Level | Definition | Response SLA | Examples |
|---|---|---|---|
| **SEV-1 (Critical)** | Platform down, data breach, security compromise | 15 min | Full outage, RCE exploit, PII exfiltrated |
| **SEV-2 (High)** | Major feature degraded, data at risk | 1 hour | Auth bypass, payment failure, data corruption |
| **SEV-3 (Medium)** | Non-critical degradation | 4 hours | Slow API, UI bugs, failed integrations |
| **SEV-4 (Low)** | Minor issues, cosmetic bugs | Next business day | UI glitches, minor errors |

---

## 3. Incident Response Phases

### Phase 1: Detection & Triage (0–15 min)

```
□ Alert fires (PagerDuty / Sentry / customer report)
□ On-call engineer acknowledges within 5 min
□ Assess severity (SEV-1 to SEV-4)
□ Open incident Slack channel: #inc-YYYY-MM-DD-[name]
□ Post initial message: what is known, what is unknown
□ Page Incident Commander if SEV-1 or SEV-2
□ Start incident timeline document
```

### Phase 2: Containment (15 min–1 hour)

```
□ Identify blast radius — which tenants/users affected?
□ Isolate affected service if possible (feature flag off, traffic reroute)
□ Preserve evidence BEFORE patching (logs, heap dumps, DB snapshots)
□ For suspected breach:
    □ Rotate compromised credentials immediately
    □ Revoke affected API keys
    □ Enable enhanced audit logging
    □ Block attacker IPs in IP allowlist
□ Notify Customer Success for customer-facing incidents
```

### Phase 3: Investigation (Parallel with Containment)

```
□ Pull audit logs from audit_logs table for timeframe
□ Check Sentry for correlated errors
□ Check Supabase logs (Auth, Database, Edge Functions)
□ Identify root cause: code bug / config error / external attack / third party
□ Document findings in incident doc
```

### Phase 4: Remediation

```
□ Implement fix in feature branch
□ Deploy hotfix (skip normal PR review if SEV-1 — CTO approves verbally)
□ Verify fix resolves issue in staging
□ Deploy to production with monitoring active
□ Confirm incident resolved — check error rates, logs
```

### Phase 5: Communication

**Internal (all severities):**
- Post updates in #inc-channel every 30 min while active
- Tag @leadership-team for SEV-1

**Customer Communication Templates:**

*SEV-1/2 — Status Page:*
```
We are currently investigating an issue affecting [feature]. 
Our team is actively working on a resolution. 
Updates will be posted every 30 minutes.
Started: [TIME UTC]
```

*Resolution:*
```
The incident affecting [feature] has been resolved as of [TIME UTC].
Root cause: [brief description]
We will publish a post-mortem within 72 hours.
We apologize for the disruption.
```

**Legal/Regulatory Notification (Data Breach):**
- GDPR: Notify supervisory authority within **72 hours** of awareness
- If >250 employees affected: notify all affected users within 30 days
- Contact DPO immediately at incident declaration

### Phase 6: Post-Mortem (within 72 hours of resolution)

```
□ Blameless post-mortem meeting (all stakeholders)
□ Complete post-mortem document (template below)
□ Create action items with owners + due dates
□ Share post-mortem with affected customers (redacted)
□ Update runbooks if applicable
```

---

## 4. Post-Mortem Template

**Title:** [Incident Name]  
**Date:** ____________  
**Duration:** ____________  
**Severity:** SEV-___  
**Incident Commander:** ____________  

### Timeline
| Time (UTC) | Event |
|---|---|
| | Alert fired |
| | IC engaged |
| | Containment |
| | Root cause identified |
| | Fix deployed |
| | Incident resolved |

### Impact
- **Users affected:** ___
- **Workspaces affected:** ___
- **Data at risk:** Yes / No
- **Revenue impact:** ___

### Root Cause
[5-Why analysis]

### What Went Well
-
-

### What Didn't Go Well
-
-

### Action Items
| Action | Owner | Due | Priority |
|---|---|---|---|
| | | | |

---

## 5. Runbooks

### Runbook: Database Overload
1. Check Supabase dashboard for connection count
2. Enable read replica routing if available
3. Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 minutes'`
4. Increase connection pool size
5. Enable query caching

### Runbook: Authentication Service Down
1. Check Supabase Auth status at status.supabase.com
2. If Supabase issue: post status page update, wait
3. If our issue: check edge function logs, redeploy auth edge functions
4. Last resort: enable maintenance mode page

### Runbook: Data Breach Suspected
1. **Do not delete or overwrite anything**
2. Immediately notify CTO + Legal
3. Take DB snapshot for forensic preservation
4. Disable affected user accounts / revoke tokens
5. Start breach investigation log
6. Contact legal counsel within 1 hour
7. Prepare GDPR 72-hour notification

### Runbook: Payment Processing Failure
1. Check Stripe status dashboard
2. Check stripe edge function logs
3. If our code: rollback to last good deployment
4. Email affected customers with manual payment link
5. Reconcile charges after recovery

---

## 6. Tools & Access

| Tool | URL | Use |
|---|---|---|
| Sentry | sentry.io | Error tracking |
| Supabase Dashboard | supabase.com/dashboard | DB + Auth logs |
| PagerDuty | pagerduty.com | Alerting |
| Status Page | bridgebox.ai/status | Public updates |
| Slack | #incidents | Coordination |

---

*Questions? Contact security@bridgebox.ai*
