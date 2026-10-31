---
description: Connect (or switch) your Google Analytics account
argument-hint: "[optional path to OAuth client JSON]"
---

Connect Google Analytics. Call `ga_login`, passing `client_secret_file` = "$ARGUMENTS" if a path was given. Tell the user to finish signing in in the browser window that opens. When done, call `list_accounts` and show which accounts and properties are now available.
