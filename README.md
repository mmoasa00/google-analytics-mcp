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

### 2. Set it up: Claude walks you through it

Ask Claude:

> **"Help me set up Google Analytics"**

In Claude Code you can also type `/ga-setup`. Claude checks what's already done and gives you **one step at a time**: which link to open, exactly what to click, and what you should see. It checks each step before moving on, and helps if something looks different or shows an error.

| You are… | What you'll do | Time |
|---|---|---|
| **The first person on your team** | Create a free Google "OAuth client" (a sign-in key for your team) in Google Cloud, then connect | ~10 min, once |
| **A teammate** who received a `client_secret_….json` file | Put the file in your Downloads folder, then say "connect my Google Analytics" | ~2 min |

Prefer reading? The full step-by-step checklist is in **[docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md)**.

### 3. Ask questions

- "Which GA properties do I have?"
- "How did traffic change this month vs last month, by channel?"
- "Top 20 landing pages by conversions in the last 90 days"
- "How many people are on the site right now, and from where?"
- `/ga-report mysite.com last 30 days`

---

## The OAuth client, in short

Google requires every app that signs people in to have an "OAuth client". It's free. One person creates it once, and the whole team uses the same file. The [step-by-step guide](docs/SETUP-GUIDE.md) covers each click. In summary:

1. [Create a Google Cloud project](https://console.cloud.google.com/projectcreate).
2. Enable the [Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com) and the [Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com).
3. [Google Auth Platform](https://console.cloud.google.com/auth/overview) → **Get started**. Choose **Internal** if everyone is on one Google Workspace domain; otherwise choose **External**.
4. External only: [Audience](https://console.cloud.google.com/auth/audience) → **Publish app**. Or add test users, but then sign-ins expire every 7 days.
5. [Clients](https://console.cloud.google.com/auth/clients) → **Create client** → **Desktop app** → **Download JSON** *straight away*. Google shows the secret only once.
6. Say "connect my Google Analytics". The file is found in your Downloads folder automatically. You can also connect from a terminal:
   ```bash
   npx -y github:mmoasa00/google-analytics-mcp login
   ```

### Sharing with your team

Pick one:

- **Send the JSON file** to teammates privately. They save it to their Downloads folder and say "connect my Google Analytics".
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
| `ga_setup` | Guided setup: detects what's done and returns the next step, with links and fixes |
| `ga_login` / `ga_logout` / `ga_auth_status` | Connect, disconnect, or show the connected Google account |
| `list_accounts` | All accounts and GA4 properties you can access |
| `get_property` | Property settings, data streams, key events and linked Google Ads accounts |
| `get_metadata` | Every dimension and metric available, including custom ones |
| `run_report` | Any report: dimensions × metrics × date ranges, with filters, sorting and paging |
| `batch_run_reports` | Up to 5 reports in one call |
| `run_pivot_report` | Pivot tables |
| `run_funnel_report` | Funnel analysis |
| `run_realtime_report` | The last 30 minutes of activity |

Claude Code also gets a `google-analytics` skill, plus the `/ga-setup`, `/ga-connect` and `/ga-report` commands.

## Limits

- **GA4 only.** Google has shut down Universal Analytics data.
- Google's free [API quotas](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) apply per property. They're generous for normal use.
- Results are subject to GA's own sampling and thresholding. When that happens, the server includes it in the response.

## Troubleshooting

| Problem | Fix |
|---|---|
| "No Google OAuth client file found" | Ask Claude "help me set up Google Analytics", or follow [the guide](docs/SETUP-GUIDE.md). |
| "API has not been used / is disabled" | Enable both Analytics APIs in the Google Cloud project that owns the OAuth client. |
| 403 on a property | The signed-in account doesn't have access to that property in GA. |
| "Access blocked" when signing in | The app is in Testing and your email isn't a test user. See step 4 of the guide. |
| "Google Analytics access was not granted" | Tick **See and download your Google Analytics data** on the Google consent screen. |
| "rejected the saved credentials" | Run `ga_login` again. If this happens weekly, publish the app (step 4). |
| No browser opens | Copy the URL that `ga_login` prints and open it yourself. |

## License

MIT. Free forever.
