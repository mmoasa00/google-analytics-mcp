---
name: google-analytics
description: Query the user's Google Analytics 4 data — accounts, properties, traffic, users, sessions, conversions/key events, revenue, acquisition channels, campaigns, landing pages, events, devices, geography, funnels and realtime activity. Use whenever the user asks about their website or app analytics, GA, GA4, traffic, visitors, or conversions.
---

# Google Analytics (GA4)

The `google-analytics` MCP server gives read-only access to the user's GA4 data.

## Connecting
- If any tool says the user is not signed in, call `ga_login`. A browser window opens for Google sign-in.
- If `ga_login` says no OAuth client is configured, point the user to the README section "Create your OAuth client" (a free, one-time Google Cloud step). Once they have the downloaded JSON, call `ga_login` with `client_secret_file` set to its path.
- `ga_auth_status` shows which account is connected; `ga_logout` disconnects it.

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
