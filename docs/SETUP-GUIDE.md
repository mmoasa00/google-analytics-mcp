# Setup guide: connect Google Analytics to Claude

Follow these steps in order. Each step says exactly what to click and what you should see afterwards.
Or skip reading: ask Claude **"help me set up Google Analytics"** and it will walk you through one step at a time and check each one.

Everything here is free. First person on the team: steps 1 to 7 (about 10 minutes, once). Teammates: the Teammates step, then steps 6 and 7 (2 minutes).

## Before you begin: pick your path
*For: Everyone*

1. Did someone on your team already send you a file named like `client_secret_….apps.googleusercontent.com.json`?
2. **Yes** → skip to **Teammates: save the file you received**. You only need 2 minutes.
3. **No**, or you are the first person on your team → follow steps **1 to 7**. About 10 minutes, once. Afterwards you share one file with your team.
4. You need a Google account that can already see your data in Google Analytics (https://analytics.google.com).

## Teammates: save the file you received
*For: Teammates who received a client file*

1. Save the `client_secret_….json` file you received into your **Downloads** folder. Keep the name as it is.
2. Unless the person who sent it says the app is published (or Internal), ask them to add your Google email as a **test user** first. Otherwise Google will say "Access blocked".
3. Go to step **6 (Connect)**.

**If something goes wrong:**
- Renamed the file? Either rename it back to start with `client_secret`, or give Claude the full path to it.

## Step 1: Create a Google Cloud project
*For: First person on the team*

Link: https://console.cloud.google.com/projectcreate

1. Open the link and sign in with your Google account. If asked, accept the Google Cloud terms. It is free and no credit card is needed.
2. In **Project name**, type `GA for Claude`.
3. Leave **Location** as it is and click **Create**.
4. Wait about 20 seconds. A notification appears at the top right. Click **Select project**.

**You should see:** The project picker at the top-left of the page shows **GA for Claude**.

**If something goes wrong:**
- Always check the project picker at the top-left shows **GA for Claude** before each of the next steps. Working in the wrong project is the most common mistake.

## Step 2: Turn on the two Google Analytics APIs
*For: First person on the team*

Link: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com

1. Open the first link: **Google Analytics Admin API**. Check the project picker shows **GA for Claude**, then click the blue **Enable** button.
2. Open https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com : **Google Analytics Data API**. Click **Enable**.

**You should see:** Each page now shows **API Enabled** and a **Manage** button instead of **Enable**.

**If something goes wrong:**
- Make sure you enable **both** APIs: the Admin API lists your properties, the Data API reads the reports.

## Step 3: Set up the sign-in screen (Google Auth Platform)
*For: First person on the team*

Link: https://console.cloud.google.com/auth/overview

1. Open the link. Click **Get started**.
2. **App information**: App name `GA for Claude`, choose your email under **User support email**. Click **Next**.
3. **Audience**: choose **Internal** if everyone who will use this has an email at the same company Google Workspace domain (best: no warnings, no limits). Otherwise choose **External** (for example personal @gmail.com accounts; Internal is greyed out for those). Click **Next**.
4. **Contact information**: type your email. Click **Next**.
5. **Finish**: tick **I agree to the Google API Services: User Data Policy**, click **Continue**, then **Create**.

**You should see:** You land on the Google Auth Platform **Overview** page with no "not configured" message.

## Step 4: Allow people to sign in (External only)
*For: First person on the team. Skip if you chose Internal.*

Link: https://console.cloud.google.com/auth/audience

1. Open the link. Under **Publishing status** it says **Testing**.
2. **Recommended:** click **Publish app**, then **Confirm**. Anyone you share with can now sign in. They will see a "Google hasn't verified this app" warning they click past (shown in step 6). Up to 100 people can use an unverified app.
3. **Or** stay in Testing: under **Test users** click **Add users**, enter each person's Gmail address, click **Save**. Note: in Testing mode everyone has to reconnect every 7 days.

**You should see:** Publishing status shows **In production**, or your test users are listed.

**If something goes wrong:**
- If Google asks you to "prepare for verification", you can ignore it. Verification (free) only removes the warning screen and the 100-user limit.

## Step 5: Create the OAuth client and download it
*For: First person on the team*

Link: https://console.cloud.google.com/auth/clients

1. Open the link. Click **+ Create client**.
2. **Application type**: choose **Desktop app**. Not "Web application".
3. **Name**: `Claude`. Click **Create**.
4. A box **OAuth client created** appears. Click **Download JSON** right now. Google shows the secret only this one time.
5. The file `client_secret_….apps.googleusercontent.com.json` is now in your **Downloads** folder. Leave it there and keep the name.

**You should see:** A `client_secret_….json` file in your Downloads folder.

**If something goes wrong:**
- Closed the box without downloading? Delete that client and create a new one.
- Chose "Web application" by mistake? Create a new client with type **Desktop app**. Web clients will not work.

## Step 6: Connect
*For: Everyone*

1. **Before you sign in, check who is allowed:** open Google Auth Platform → **Audience** (https://console.cloud.google.com/auth/audience). If it says **Internal**, or Publishing status is **In production**, you are fine. If it says **Testing**, your Google email must be listed under **Test users**; if it is not, click **+ Add users**, add it and click **Save**. This matters most if you reused an existing project.
2. In Claude, say **"connect my Google Analytics"**. In Claude Code you can also type `/ga-connect`. Claude finds the file in your Downloads folder automatically.
3. A browser tab opens. Choose the Google account that has access to your Google Analytics.
4. If you see **"Google hasn't verified this app"**: click **Advanced** (bottom left), then **Go to <your app name> (unsafe)**. It is your own app, so this is expected.
5. **Important:** on the next screen, tick the box **See and download your Google Analytics data**, then click **Continue**.
6. The tab shows **Connected to Google Analytics**. Close it and go back to Claude.

**You should see:** Claude confirms you are signed in and lists your Google Analytics accounts.

**If something goes wrong:**
- **"Access blocked: … has not completed the Google verification process"**: the app is in Testing and your email is not a test user. Add it on the Audience page (first item above, or step 4), then sign in again.
- **"Error 400: redirect_uri_mismatch"**: the client is a "Web application". Redo step 5 with **Desktop app**.
- **"Error 401: deleted_client"** or **"invalid_client"**: the client was deleted or the file is wrong. Get a fresh file (step 5).
- No browser tab opened: Claude shows a link. Copy it into your browser.

## Step 7: Check it works, then share
*For: Everyone (sharing: first person only)*

1. Ask Claude: **"Which Google Analytics properties do I have?"** You should see your accounts and properties.
2. First person: send the `client_secret_….json` file to your teammates **privately** (direct message or email, not a public channel). They follow **Teammates: save the file you received**, then step **6**.
3. Each person signs in with their own Google account and only sees the properties they already have access to.

**If something goes wrong:**
- **"API has not been used … or it is disabled"**: one of the APIs from step 2 is off, in the project that owns the client file. Open the link in the error and click **Enable**, wait 1 minute, try again.
- **No accounts listed**: the Google account you signed in with has no access in Google Analytics. Have a GA admin add you under Admin → Account access management (Viewer is enough), or say "log out of Google Analytics" and connect with another account.

