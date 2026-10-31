# Google Analytics MCP: a free GA4 connector for Claude

Lets Claude read **all of your Google Analytics 4 data**: accounts, properties, traffic, conversions, revenue, funnels and realtime activity. It's free and open source (MIT).

- **Free:** it talks straight to Google's own Analytics APIs, which cost nothing. No subscription, no third-party service, no server to host.
- **Private:** your data only travels between your computer and Google. Your sign-in token stays on your machine.
- **Read-only:** it can't change anything in Google Analytics.
- **Nothing extra to install:** it needs only [Node.js](https://nodejs.org) 18 or newer.
- **Works with** Claude Code, Claude Desktop, Cursor and any other MCP client.

---

## Quick start

### 1. Install

**Claude Code:** inside Claude Code, run:

```
/plugin marketplace add mmoasa00/google-analytics-mcp
/plugin install google-analytics@google-analytics-mcp
```

Then restart Claude Code.

**Claude Desktop, Cursor and other MCP clients:** add this to the app's MCP config. In Claude Desktop that's Settings → Developer → Edit Config:

```json
{
  "mcpServers": {
    "google-analytics": {
      "command": "npx",
      "args": ["-y", "github:mmoasa00/google-analytics-mcp"]
    }
  }
}
```

### 2. Connect your Google account

Ask Claude **"connect my Google Analytics"** (in Claude Code you can also run `/ga-connect`). A browser window opens. Sign in with Google and allow read-only access, and you're done.

> **First time on your team?** Signing in needs an "OAuth client": a free, one-time setup in Google Cloud that takes about 5 minutes. See [Create your OAuth client](#create-your-oauth-client) below. One person on the team does it once and shares the file. Everyone else just signs in.

### 3. Ask questions

- "Which GA properties do I have?"
- "How did traffic change this month vs last month, by channel?"
- "Top 20 landing pages by conversions in the last 90 days"
- "How many people are on the site right now, and from where?"
- `/ga-report mysite.com last 30 days`

---

## Create your OAuth client

Google requires every app that signs users in to have an OAuth client. Creating one is free.

1. Go to <https://console.cloud.google.com/projectcreate> and create a project, for example "GA for Claude".
2. Enable both of these APIs in that project:
   - [Google Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)
   - [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
3. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) → **Get started**:
   - **App name:** anything, for example "GA for Claude". **Support email:** yours.
   - **Audience:**
     - **Internal** if everyone uses the same Google Workspace domain. This is the best choice for teams: no warnings and no limits.
     - **External** otherwise (for example, personal Gmail accounts).
4. Go to **Data Access** → **Add or remove scopes** → add `https://www.googleapis.com/auth/analytics.readonly` → Save.
5. Go to **Clients** → **Create client** → Application type **Desktop app** → Create → **Download JSON**.
6. External audience only: go to **Audience** and do one of these:
   - **Publish app → In production.** Anyone can sign in. They'll see a "Google hasn't verified this app" screen; click *Advanced → Go to …* to continue. Unverified apps are limited to 100 users. To remove the warning and the limit, submit the app for [verification](https://support.google.com/cloud/answer/13463073). It's free for this scope.
   - **Stay in Testing** and add each person under *Test users*. Note that sign-ins expire every 7 days in Testing mode.

Then connect: tell Claude *"connect Google Analytics using ~/Downloads/client_secret_XXXX.json"*. Or run this in a terminal:

```bash
npx -y github:mmoasa00/google-analytics-mcp login ~/Downloads/client_secret_XXXX.json
```

The client is saved to `~/.config/ga-mcp/oauth-client.json`. You only need to do this once per computer.

### Sharing with your team

Pick one:

- **Send the JSON file** to teammates privately. Each person passes it to `ga_login` once.
- **Fork this repo** and save the file as `plugins/google-analytics/oauth-client.json` in your fork (see `oauth-client.example.json`). Teammates install from your fork and only have to click "Sign in". Google [doesn't treat](https://developers.google.com/identity/protocols/oauth2/native-app) desktop-app client secrets as confidential, but a private fork is still the tidier choice.

Each person signs in with **their own** Google account and sees only the GA properties they already have access to.

---

## Other ways to authenticate

The server checks for credentials in this order:

| Method | How |
|---|---|
| **Service account** (servers, automation, no browser) | Create a service account key in Google Cloud. In GA, go to Admin → Property access management and add the service account's email as **Viewer**. Then set `GA_CREDENTIALS_FILE=/path/to/key.json`. |
| **Browser sign-in** (`ga_login`) | Described above. The token is saved to `~/.config/ga-mcp/token.json` (readable only by you). |
| **gcloud** | If you've already run `gcloud auth application-default login` with the `analytics.readonly` scope, it's picked up automatically. |

### Environment variables (all optional)

| Variable | Purpose |
|---|---|
| `GA_CREDENTIALS_FILE` / `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service account or authorized-user JSON file |
| `GA_OAUTH_CLIENT_ID`, `GA_OAUTH_CLIENT_SECRET` | OAuth client, instead of a JSON file |
| `GA_QUOTA_PROJECT` | Google Cloud project to bill API quota to. Free, but sometimes needed with gcloud credentials. |
| `GA_MCP_CONFIG_DIR` | Where the client and token are stored. Default: `~/.config/ga-mcp` |

---

## Tools

| Tool | What it does |
|---|---|
| `ga_login` / `ga_logout` / `ga_auth_status` | Connect, disconnect, or show the connected Google account |
| `list_accounts` | All accounts and GA4 properties you can access |
| `get_property` | Property settings, data streams, key events and linked Google Ads accounts |
| `get_metadata` | Every dimension and metric available, including custom ones |
| `run_report` | Any report: dimensions × metrics × date ranges, with filters, sorting and paging |
| `batch_run_reports` | Up to 5 reports in one call |
| `run_pivot_report` | Pivot tables |
| `run_funnel_report` | Funnel analysis |
| `run_realtime_report` | The last 30 minutes of activity |

Claude Code also gets a `google-analytics` skill, plus the `/ga-connect` and `/ga-report` commands.

## Limits

- **GA4 only.** Google has shut down Universal Analytics data.
- Google's free [API quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) apply per property. They're generous for normal use.
- Results are subject to GA's own sampling and thresholding. When that happens, the server includes it in the response.

## Troubleshooting

| Problem | Fix |
|---|---|
| "No Google OAuth client configured" | Follow [Create your OAuth client](#create-your-oauth-client). |
| "API has not been used / is disabled" | Enable both Analytics APIs in the Google Cloud project that owns the OAuth client. |
| 403 on a property | The signed-in account doesn't have access to that property in GA. |
| "sign-in expired" | Run `ga_login` again. If this happens weekly, publish the app to *In production* (step 6). |
| No browser opens | Copy the URL that `ga_login` prints and open it yourself. |

## License

MIT. Free forever.
