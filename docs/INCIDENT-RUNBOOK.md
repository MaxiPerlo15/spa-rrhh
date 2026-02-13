# Incident Runbook (Sentry + API)

## Goal

Provide a minimal, actionable response process for production incidents and required Sentry alert coverage.

## Sentry Alert Rules (Required)

Create these alert rules in Sentry project `javascript-nextjs`:

1. `Critical API failure spike`
- Condition: error events in API routes above baseline over 5 minutes
- Filter: tags include `route` or message matching `/api/`
- Action: notify primary owner channel immediately

2. `Auth/Admin failures burst`
- Condition: repeated 401/403 or auth-related exceptions in short window
- Filter: messages/tags containing auth, signin, session
- Action: notify owner + create incident thread
- Extra signals to watch:
  - spikes of `AUTH_THROTTLED` in signin
  - repeated temporary blocks in forgot/reset password
  - sustained increase of 429 responses on auth endpoints

3. `Upload/Turnstile integration failures`
- Condition: repeated failures with tags/messages related to uploadthing/turnstile
- Action: notify owner and annotate incident issue

4. `Regression detector`
- Condition: new issue with high event volume in first 30 minutes
- Action: notify owner channel with issue URL

## Ownership and Channels

- Primary owner: project maintainer (`maxiperlo`)
- Backup owner: designated technical backup with Sentry access
- Notification channels:
  - Real-time: team chat channel
  - Escalation: email distribution for unresolved incidents

## Triage Steps

1. Identify blast radius:
- Which routes/pages are affected.
- Whether issue is public-facing (candidate/contact forms, vacancies page) or admin-only.

2. Classify severity:
- `SEV-1`: core user flow broken or data/security risk
- `SEV-2`: degraded functionality with workaround
- `SEV-3`: minor impact, monitor and schedule fix

3. Mitigation-first:
- Roll back last deployment if regression is recent and severe.
- Disable non-essential integration path if safe fallback exists.

4. Root cause:
- Check recent commits, deployment diff, and Sentry breadcrumb/tags.
- Confirm whether issue is environment/config related.

5. Resolution:
- Patch, validate (`test`, `build`, `tsc`, `lint`), deploy.
- Close incident only after post-fix monitoring window.

## Post-Incident Checklist

1. Link incident to Linear issue.
2. Add prevention action item (test, guardrail, alert tuning, docs).
3. Update this runbook if detection/response was insufficient.
