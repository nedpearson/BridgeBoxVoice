# Disaster Recovery Runbook

**Owner:** CTO / Head of Infrastructure  
**Classification:** Confidential  
**Last Updated:** March 2026  
**Review Cycle:** Semi-Annual + After Any DR Event  

---

## 1. Overview

**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 1 hour  

This runbook defines step-by-step procedures to recover the Bridgebox Voice platform in the event of a major failure or disaster.

---

## 2. Disaster Scenarios

| Scenario | Severity | Likelihood | Recovery Procedure |
|---|---|---|---|
| Supabase regional outage | Critical | Low | Section 4.1 |
| Database corruption | Critical | Very Low | Section 4.2 |
| Full application deployment failure | High | Low | Section 4.3 |
| Edge function mass failure | High | Low | Section 4.4 |
| DNS / CDN failure | High | Very Low | Section 4.5 |
| Cloud Run service failure | Medium | Low | Section 4.6 |
| Third-party dependency failure | Medium | Medium | Section 4.7 |

---

## 3. Pre-DR Checklist

Before declaring a disaster:

```
□ Confirm incident is not caused by a recent deployment (roll back first)
□ Check Supabase status: status.supabase.com
□ Check Cloudflare status: cloudflarestatus.com
□ Check AWS status: health.aws.amazon.com
□ Attempt standard rollback procedures (Section 4.3)
□ If unresolved in 30 minutes → declare DR
□ Page Incident Commander
□ Open #disaster-recovery Slack channel
□ Start DR timeline log
```

---

## 4. Recovery Procedures

### 4.1 Supabase Regional Outage

**Trigger:** Supabase region us-east-1 is down.  
**Impact:** Full platform down.  

```bash
# Step 1: Confirm Supabase outage
# → Check status.supabase.com

# Step 2: Activate backup project (pre-provisioned)
# Backup Supabase project: [BACKUP_PROJECT_REF]
export BACKUP_URL="https://[BACKUP_PROJECT_REF].supabase.co"
export BACKUP_ANON_KEY="[BACKUP_ANON_KEY]"

# Step 3: Point app to backup project
# In Cloudflare Workers / environment:
npx wrangler secret put VITE_SUPABASE_URL --env production
# Enter: $BACKUP_URL

npx wrangler secret put VITE_SUPABASE_ANON_KEY --env production
# Enter: $BACKUP_ANON_KEY

# Step 4: Restore latest backup to backup project
# → Use Supabase dashboard: Settings → Backups → Restore
# Select most recent backup

# Step 5: Redeploy frontend to pick up new env vars
npm run build
# Deploy to hosting

# Step 6: Verify
# → Test login, data read, basic workflows

# Step 7: Update status page
# → Post incident on bridgebox.ai/status

# Step 8: Monitor until primary region recovers
# Step 9: Migrate back to primary (see Section 5)
```

---

### 4.2 Database Corruption

**Trigger:** Data is missing, inconsistent, or corrupted in production DB.  

```bash
# Step 1: STOP ALL WRITES IMMEDIATELY
# Enable maintenance mode (feature flag)
# → In Supabase: set feature_flag 'maintenance_mode' = true across all workspaces

# Step 2: Snapshot current state for forensics
# → Supabase Dashboard → Settings → Database Backups → Create backup now

# Step 3: Identify corruption scope
SELECT schemaname, tablename, attname 
FROM pg_stats 
WHERE null_frac > 0.5;  -- look for anomalous null fractions

# Step 4: Restore from point-in-time
# Supabase Dashboard → Settings → Backups → Point in Time Recovery
# Select timestamp BEFORE corruption was introduced

# Step 5: Validate restored data
SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours';
SELECT COUNT(*) FROM workspace_members;
-- Compare with pre-incident baselines

# Step 6: Re-enable writes
# → Set maintenance_mode feature flag to false

# Step 7: Notify affected customers
# → Email template available in /docs/templates/data-recovery-notification.md
```

---

### 4.3 Deployment Failure / Rollback

**Trigger:** A new deployment broke the platform.  

```bash
# Step 1: Identify last good deployment tag
git log --oneline -20

# Step 2: Revert to last good version
git revert HEAD  # or
git checkout [LAST_GOOD_COMMIT] -- .

# Step 3: Build and redeploy
npm run build

# Cloud Run rollback:
gcloud run services update-traffic bridgebox-app \
  --to-revisions=[PREV_REVISION]=100 \
  --region=europe-west1

# Step 4: Verify in staging first, then production
# Step 5: Investigate root cause before re-deploying
```

---

### 4.4 Edge Function Mass Failure

**Trigger:** Multiple Supabase Edge Functions returning 500/503.  

```bash
# Step 1: Check function logs
npx supabase functions logs --project-ref xuplmlfnhdtkqwbgplop --function [fn-name]

# Step 2: Redeploy all functions
npx supabase functions deploy --project-ref xuplmlfnhdtkqwbgplop

# Step 3: If redeploy fails, check for secret issues
npx supabase secrets list --project-ref xuplmlfnhdtkqwbgplop

# Step 4: Roll back to previous version
git checkout [LAST_GOOD_COMMIT] -- supabase/functions/
npx supabase functions deploy --project-ref xuplmlfnhdtkqwbgplop
```

---

### 4.5 DNS / CDN Failure

**Trigger:** Cloudflare outage or DNS misconfiguration.  

```bash
# Step 1: Check Cloudflare status
# → cloudflarestatus.com

# Step 2: If Cloudflare outage — temporarily bypass CDN
# → Change DNS A record to point directly to origin server IP
# TTL: 60 seconds (pre-set emergency record)

# Step 3: If DNS misconfiguration
# → Revert DNS changes in Cloudflare dashboard
# → Roll back to previous record set (stored in /docs/infrastructure/dns-baseline.txt)

# Step 4: Monitor propagation
# → Use dnschecker.org to confirm propagation
```

---

### 4.6 Third-Party Dependency Failure

| Dependency | Failure Response |
|---|---|
| **Anthropic (AI)** | Show "AI temporarily unavailable" banner; queue requests; retry when recovered |
| **Stripe (billing)** | Disable billing UI; email customers; accept manual payments |
| **Twilio (SMS/voice)** | Fall back to email-only notifications |
| **Sentry** | Log to file; continue operating |

---

## 5. Failback to Primary (Post-DR)

After primary system is restored:

```
□ Confirm primary system is stable for > 30 min
□ Sync any data written to backup during outage
□ Enable dual-write mode (write to both primary + backup) for 1 hour
□ Verify data consistency between environments
□ Switch traffic back to primary
□ Disable dual-write mode
□ Monitor for 2 hours
□ Declare incident resolved
□ Debrief + post-mortem within 72 hours
```

---

## 6. Key Contacts (DR-Specific)

| Role | Contact | Escalation |
|---|---|---|
| Incident Commander | | CEO |
| Supabase Support | support@supabase.io | Enterprise SLA: 4h |
| Cloudflare Support | cloudflare.com/support | Business: 2h |
| AWS Support | aws.amazon.com/support | Business: 1h |
| Legal (breach) | | GC: [number] |

---

## 7. DR Test Schedule

| Test Type | Frequency | Last Completed | Next Scheduled |
|---|---|---|---|
| Backup restoration test | Quarterly | Q4 2025 | Q2 2026 |
| Full DR table-top exercise | Semi-annual | — | Q3 2026 |
| Failover drill | Annual | — | Q4 2026 |
| RTO/RPO validation | Annual | — | Q4 2026 |

---

*Questions: engineering@bridgebox.ai*
