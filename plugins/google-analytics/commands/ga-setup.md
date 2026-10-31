---
description: Step-by-step guided setup to connect Google Analytics
---

Guide the user through connecting Google Analytics.

1. Call `ga_setup`. It checks what's already done and returns the next step.
2. Show **only that one step**, in plain language: the link, exactly what to click or type, and what they should see afterwards. Don't paste the whole guide.
3. Ask them to tell you when it's done, or what they see if it looks different. Then call `ga_setup` again to check and get the next step. To jump to a specific step, call `ga_setup` with `step` set to that step's id.
4. If they report an error, use that step's "If something goes wrong" notes. Ask what is on their screen before guessing.
5. When `ga_setup` returns step 6 (Connect), explain what they'll see in the browser: the "unverified app" screen, and the box they must tick. Then call `ga_login`.
6. When `ga_setup` says SETUP COMPLETE, show their properties with `list_accounts`. If they set this up for a team, remind them how to share the client file.

Be patient and encouraging. Many people find Google Cloud confusing.
