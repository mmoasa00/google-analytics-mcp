---
description: Connect (or switch) your Google Analytics account
argument-hint: "[optional path to OAuth client JSON]"
---

Connect Google Analytics.

- If a path was given ("$ARGUMENTS"), call `ga_login` with `client_secret_file` set to it.
- Otherwise call `ga_setup` first. If it says a client file is ready, call `ga_login`. If not, follow the `/ga-setup` approach: guide the user one step at a time.

Before calling `ga_login`, ask the user to confirm the app is Internal or published, or that their email is listed under **Test users** on the Google Auth Platform → Audience page (`ga_setup` gives the exact link). Otherwise Google says "Access blocked". Then tell the user what will happen. A browser tab opens. If Google says "Google hasn't verified this app", they click **Advanced**, then **Go to … (unsafe)**. They must **tick the box "See and download your Google Analytics data"**. When it's done, call `list_accounts` and show which accounts and properties are now available.
