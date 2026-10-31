---
name: google-analytics
description: Query the user's Google Analytics 4 data — accounts, properties, traffic, users, sessions, conversions/key events, revenue, acquisition channels, campaigns, landing pages, events, devices, geography, funnels and realtime activity. Use whenever the user asks about their website or app analytics, GA, GA4, traffic, visitors, or conversions.
---

# Google Analytics (GA4)

The `google-analytics` MCP server gives read-only access to the user's GA4 data.

## Connecting (setup is confusing for most people, so guide them carefully)
- If the user isn't connected, any tool says they aren't signed in, or they ask to set up or connect GA: call `ga_setup`. It detects what's already done and returns the next step.
- Walk them through **one step at a time**: the link, exact buttons, and what they should see. Wait for them to confirm, then call `ga_setup` again to check. Never dump all the steps at once.
- Teammates who received a `client_secret_….json` file only need to put it in their Downloads folder. `ga_login` finds it automatically.
- Before `ga_login`, warn them about the "unverified app" screen (Advanced → Go to …) and that they must tick **"See and download your Google Analytics data"**.
- `ga_auth_status` shows the connected account. `ga_logout` disconnects it.
- The full written guide is in docs/SETUP-GUIDE.md in the repo.

## Workflow
1. `list_accounts` to find the property ID. If there are several properties and the user didn't say which, ask.
2. `get_metadata` (with `search`) when unsure of a field name or to find custom dimensions/metrics.
3. `run_report` for almost everything. `run_realtime_report` for "right now". `batch_run_reports` for several views at once. `run_pivot_report` / `run_funnel_report` for pivots and funnels.
4. `get_property` for time zone, currency, data streams, key events and linked Google Ads accounts.

## Useful GA4 names
- Dimensions: `date`, `yearMonth`, `sessionDefaultChannelGroup`, `sessionSource`, `sessionMedium`, `sessionCampaignName`, `landingPage`, `pagePath`, `pageTitle`, `eventName`, `country`, `city`, `deviceCategory`, `browser`, `newVsReturning`.
- Metrics: `activeUsers`, `newUsers`, `sessions`, `engagedSessions`, `engagementRate`, `averageSessionDuration`, `screenPageViews`, `eventCount`, `keyEvents`, `totalRevenue`, `purchaseRevenue`, `transactions`, `bounceRate`.
- Dates: `YYYY-MM-DD`, `today`, `yesterday`, `NdaysAgo`. Pass two `date_ranges` to compare periods; rows then include a `dateRange` column.

## Reporting
Lead with the answer, then a compact table. State the property, period and comparison. Mention sampling or thresholding if `metadata` reports it. Not every dimension/metric combination is valid; if GA rejects one, adjust and retry.
