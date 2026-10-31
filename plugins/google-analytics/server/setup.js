// Step-by-step setup guide. Single source for the ga_setup tool and docs/SETUP-GUIDE.md
// (regenerate the doc with: node server/index.js guide > ../../docs/SETUP-GUIDE.md).

import * as auth from './auth.js';
import * as ga from './ga.js';

export const STEPS = [
  {
    id: 'start',
    title: 'Before you begin: pick your path',
    who: 'Everyone',
    steps: [
      'You need a Google account that can already see your data in Google Analytics (https://analytics.google.com).',
      '**A teammate sent you a `client_secret_….json` file?** → go to **Teammates: save the file you received**. About 2 minutes.',
      '**Starting fresh** (first person on the team) → follow steps **1 to 7**. About 10 minutes, once. Afterwards you share one file with your team.',
      '**Already have a Google Cloud project** (for example one you used for Google sign-in or another API)? You can reuse it: skip step 1, and in step 3 skip whatever is already set up. Do steps 2, 4 and 5 carefully. Step 4 is the one people miss. Note that Google shows that project\'s app name on the sign-in screen, and publishing it (step 4) affects that app too. If the project belongs to another product, a new project is cleaner.',
      '**Just you, and you never want to reconnect?** A service account is an alternative to steps 3 to 6: see **Optional: never reconnect (service account)** at the end.',
    ],
  },
  {
    id: 'teammate',
    title: 'Teammates: save the file you received',
    who: 'Teammates who received a client file',
    steps: [
      'Save the `client_secret_….json` file you received into your **Downloads** folder. Keep the name as it is.',
      'Unless the person who sent it says the app is published (or Internal), ask them to add your Google email as a **test user** first. Otherwise Google will say "Access blocked".',
      'Go to step **6 (Connect)**.',
    ],
    problems: [
      'Renamed the file? Either rename it back to start with `client_secret`, or give Claude the full path to it.',
    ],
  },
  {
    id: '1',
    title: 'Create a Google Cloud project',
    who: 'First person on the team',
    link: 'https://console.cloud.google.com/projectcreate',
    steps: [
      'Open the link and sign in with your Google account. If asked, accept the Google Cloud terms. It is free and no credit card is needed.',
      'In **Project name**, type `GA for Claude`.',
      'Leave **Location** as it is and click **Create**.',
      'Wait about 20 seconds. A notification appears at the top right. Click **Select project**.',
    ],
    expect: 'The project picker at the top-left of the page shows **GA for Claude**.',
    problems: [
      'Always check the project picker at the top-left shows **GA for Claude** before each of the next steps. Working in the wrong project is the most common mistake.',
    ],
  },
  {
    id: '2',
    title: 'Turn on the two Google Analytics APIs',
    who: 'First person on the team',
    link: 'https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com',
    steps: [
      'Open the first link: **Google Analytics Admin API**. Check the project picker shows **GA for Claude**, then click the blue **Enable** button.',
      'Open https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com : **Google Analytics Data API**. Click **Enable**.',
    ],
    expect: 'Each page now shows **API Enabled** and a **Manage** button instead of **Enable**.',
    problems: [
      'Make sure you enable **both** APIs: the Admin API lists your properties, the Data API reads the reports.',
    ],
  },
  {
    id: '3',
    title: 'Set up the sign-in screen (Google Auth Platform)',
    who: 'First person on the team',
    link: 'https://console.cloud.google.com/auth/overview',
    steps: [
      'Open the link. Click **Get started**.',
      '**App information**: App name `GA for Claude`, choose your email under **User support email**. Click **Next**.',
      '**Audience**: choose **Internal** if everyone who will use this has an email at the same company Google Workspace domain (best: no warnings, no limits). Otherwise choose **External** (for example personal @gmail.com accounts; Internal is greyed out for those). Click **Next**.',
      '**Contact information**: type your email. Click **Next**.',
      '**Finish**: tick **I agree to the Google API Services: User Data Policy**, click **Continue**, then **Create**.',
    ],
    expect: 'You land on the Google Auth Platform **Overview** page with no "not configured" message.',
    problems: [
      'No **Get started** button, just an Overview page? The sign-in screen is already set up (common when you reuse a project). Skip to step 4.',
    ],
  },
  {
    id: '4',
    title: 'Allow people to sign in and stay signed in (External only)',
    who: 'First person on the team. Skip if the Audience page says Internal.',
    link: 'https://console.cloud.google.com/auth/audience',
    steps: [
      'Open the link. Look at **Publishing status**.',
      'If it says **Testing**, only listed test users can sign in, and Google signs everyone out every **7 days**.',
      '**Recommended:** click **Publish app**, then **Confirm**. Status becomes **In production**: anyone you share the file with can sign in, and nobody gets signed out after 7 days. People see a "Google hasn\'t verified this app" screen once and click past it (step 6). Up to 100 people can use an unverified app.',
      '**Or**, to stay in Testing: under **Test users** click **+ Add users**, enter each person\'s Google email, and click **Save**. Everyone will need to reconnect every 7 days.',
    ],
    expect: 'Publishing status shows **In production**, or every person\'s email is listed under Test users.',
    problems: [
      'Already connected while the app was in Testing? After publishing, reconnect once ("connect my Google Analytics") so your new sign-in no longer expires.',
      'If Google asks you to "prepare for verification", you can ignore it. Verification is free and only removes the warning screen and the 100-user limit.',
    ],
  },
  {
    id: '5',
    title: 'Create the OAuth client and download it',
    who: 'First person on the team',
    link: 'https://console.cloud.google.com/auth/clients',
    steps: [
      'Open the link. Click **+ Create client**.',
      '**Application type**: choose **Desktop app**. Not "Web application".',
      '**Name**: `Claude`. Click **Create**.',
      'A box **OAuth client created** appears. Click **Download JSON** right now. Google shows the secret only this one time.',
      'The file `client_secret_….apps.googleusercontent.com.json` is now in your **Downloads** folder. Leave it there and keep the name.',
    ],
    expect: 'A `client_secret_….json` file in your Downloads folder.',
    problems: [
      'Closed the box without downloading? Delete that client and create a new one.',
      'Chose "Web application" by mistake? Create a new client with type **Desktop app**. Web clients will not work.',
    ],
  },
  {
    id: '6',
    title: 'Connect',
    who: 'Everyone',
    steps: [
      '**Before you sign in, check who is allowed:** open Google Auth Platform → **Audience** (https://console.cloud.google.com/auth/audience). If it says **Internal**, or Publishing status is **In production**, you are fine. If it says **Testing**, your Google email must be listed under **Test users**; if it is not, click **+ Add users**, add it and click **Save**. This matters most if you reused an existing project.',
      'In Claude, say **"connect my Google Analytics"**. In Claude Code you can also type `/ga-connect`. Claude finds the file in your Downloads folder automatically.',
      'A browser tab opens. Choose the Google account that has access to your Google Analytics.',
      'If you see **"Google hasn\'t verified this app"**: click **Advanced** (bottom left), then **Go to <your app name> (unsafe)**. It is your own app, so this is expected.',
      '**Important:** on the next screen, tick the box **See and download your Google Analytics data**, then click **Continue**.',
      'The tab shows **Connected to Google Analytics**. Close it and go back to Claude.',
    ],
    expect: 'Claude confirms you are signed in and lists your Google Analytics accounts.',
    problems: [
      '**"Access blocked: … has not completed the Google verification process"**: the app is in Testing and your email is not a test user. Add it on the Audience page (first item above, or step 4), then sign in again.',
      '**"Error 400: redirect_uri_mismatch"**: the client is a "Web application". Redo step 5 with **Desktop app**.',
      '**"Error 401: deleted_client"** or **"invalid_client"**: the client was deleted or the file is wrong. Get a fresh file (step 5).',
      'No browser tab opened: Claude shows a link. Copy it into your browser.',
    ],
  },
  {
    id: '7',
    title: 'Check it works, then share',
    who: 'Everyone (sharing: first person only)',
    steps: [
      'Ask Claude: **"Which Google Analytics properties do I have?"** You should see your accounts and properties.',
      'First person: send the `client_secret_….json` file to your teammates **privately** (direct message or email, not a public channel). They follow **Teammates: save the file you received**, then step **6**.',
      'Each person signs in with their own Google account and only sees the properties they already have access to.',
    ],
    problems: [
      '**"API has not been used … or it is disabled"**: one of the APIs from step 2 is off, in the project that owns the client file. Open the link in the error and click **Enable**, wait 1 minute, try again.',
      '**No accounts listed**: the Google account you signed in with has no access in Google Analytics. Have a GA admin add you under Admin → Account access management (Viewer is enough), or say "log out of Google Analytics" and connect with another account.',
    ],
  },
  {
    id: 'service',
    title: 'Optional: never reconnect (service account)',
    who: 'Anyone who wants a connection that never expires and needs no browser sign-in',
    link: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    steps: [
      'A service account is a robot Google account. It never gets signed out, but it only sees the GA properties you explicitly add it to. You still need steps 1 and 2 (a project with both APIs on).',
      'Open the link (project picker = your project). Click **+ Create service account**. Name: `ga-reader`. Click **Create and continue**, skip the optional role and user steps, then click **Done**.',
      'Click the new account in the list. Copy its email (looks like `ga-reader@your-project.iam.gserviceaccount.com`).',
      'Open the **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**. A key file downloads. Keep it private: it works like a password.',
      'Open Google Analytics (https://analytics.google.com) → **Admin** (gear icon, bottom left) → under **Property** (or **Account** for all properties) click **Access management** → **+** → **Add users**. Paste the service account email, choose role **Viewer**, untick "Notify new users by email", click **Add**.',
      'In Claude, say: **"connect Google Analytics using ~/Downloads/<the key file name>.json"**.',
    ],
    expect: 'Claude says it is connected with the service account, and lists the properties you added it to.',
    problems: [
      '**"Service account key creation is disabled"**: your organization blocks keys. Use the normal sign-in and publish the app (step 4) instead.',
      '**No properties listed**: the service account email was not added in GA Access management, or was added to a different property.',
      'Each person needs their own key, or share one key privately within the team. Anyone with the key can read the properties it was added to.',
    ],
  },
];

const byId = (id) => STEPS.find((s) => s.id === String(id));

// Points Cloud Console links at a specific project so the user lands in the right one.
function withProject(text, project) {
  if (!project) return text;
  return text.replace(/https:\/\/console\.cloud\.google\.com\/(?!projectcreate)[^\s)*]+/g, (url) =>
    `${url}${url.includes('?') ? '&' : '?'}project=${project}`,
  );
}

export function renderStep(s, { heading = '###', project } = {}) {
  const label = /^\d+$/.test(s.id) ? `Step ${s.id}: ${s.title}` : s.title;
  const lines = [`${heading} ${label}`, `*For: ${s.who}*`, ''];
  if (s.link) lines.push(`Link: ${s.link}`, '');
  s.steps.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  if (s.expect) lines.push('', `**You should see:** ${s.expect}`);
  if (s.problems?.length) lines.push('', '**If something goes wrong:**', ...s.problems.map((p) => `- ${p}`));
  return withProject(lines.join('\n'), project);
}

export function renderGuide() {
  const order = ['start', 'teammate', '1', '2', '3', '4', '5', '6', '7', 'service'];
  return [
    '# Setup guide: connect Google Analytics to Claude',
    '',
    'Follow these steps in order. Each step says exactly what to click and what you should see afterwards.',
    'Or skip reading: ask Claude **"help me set up Google Analytics"** and it will walk you through one step at a time and check each one.',
    '',
    'Everything here is free. First person on the team: steps 1 to 7 (about 10 minutes, once). Teammates: the Teammates step, then steps 6 and 7 (2 minutes).',
    '',
    ...order.map((id) => renderStep(byId(id), { heading: '##' }) + '\n'),
  ].join('\n');
}

const GUIDE_RULES =
  'HOW TO GUIDE THE USER: show ONE step at a time in plain language, with the link and exact buttons. ' +
  'Wait for the user to say they finished it (or describe what they see) before moving on. ' +
  'If they report an error, match it against "If something goes wrong". ' +
  'Call ga_setup again any time to re-check where they are; call ga_setup with step="<id>" to get a specific step. ' +
  'Step order for the first person: start → 1 → 2 → 3 → 4 (External only) → 5 → 6 → 7. Teammates: start → teammate → 6 → 7. ' +
  'Reusing an existing project: start → 2 → 3 (skip if already set up) → 4 → 5 → 6 → 7. ' +
  'If the user asks to avoid reconnecting every 7 days: step 4 (publish) or step "service". ' +
  'Ask early whether they already have a Google Cloud project, and once known pass links for that project.';

// Works out where the user is and returns the step they should do next.
export async function setupState(stepId) {
  const client = await auth.loadClient().catch(() => null);
  const { desktop: downloaded, web: webFiles } = client ? { desktop: [], web: [] } : await auth.scanDownloadedClientFiles();
  const project = client?.project_id || (await auth.readClientProject(downloaded[0]));

  if (stepId) {
    const s = byId(stepId);
    if (!s) throw new Error(`Unknown step "${stepId}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
    return `${GUIDE_RULES}\n\n${renderStep(s, { project })}`;
  }

  let st;
  try {
    st = await auth.status();
  } catch (err) {
    st = { signedIn: false, error: err.message };
  }

  const out = [];
  let next;
  if (st.signedIn) {
    try {
      const accounts = await ga.listAccounts();
      const props = accounts.reduce((n, a) => n + a.properties.length, 0);
      if (props) {
        return [
          `SETUP COMPLETE. Signed in${st.email ? ` as ${st.email}` : ''} via ${st.source}.`,
          `${accounts.length} account(s), ${props} GA4 propert${props === 1 ? 'y' : 'ies'} available.`,
          'Tell the user it works. If they set this up for a team, remind them to share the client_secret JSON privately (step 7).',
          ...(st.source === 'ga_login'
            ? ['If their app is still in Testing (step 4), tell them Google will sign them out every 7 days unless they publish it or use a service account (step "service").']
            : []),
        ].join('\n');
      }
      out.push(`Signed in${st.email ? ` as ${st.email}` : ''}, but this Google account has no Google Analytics properties.`);
      next = '7';
    } catch (err) {
      out.push(`Signed in, but Google Analytics returned an error:\n${err.message}`);
      next = /analyticsadmin|analyticsdata|has not been used|disabled/i.test(err.message) ? '2' : '7';
    }
  } else if (client || downloaded.length) {
    out.push(
      client
        ? `An OAuth client is configured (${client.source}). The user just needs to sign in.`
        : `Found a downloaded client file: ${downloaded[0]}. ga_login will use it automatically.`,
    );
    if (st.error) out.push(`Last sign-in problem: ${st.error}`);
    const audience = `https://console.cloud.google.com/auth/audience${project ? `?project=${project}` : ''}`;
    out.push(
      'Next: walk through step 6. FIRST ask the user to confirm on the Audience page ' +
        `(${audience}) that the app is Internal, In production, or lists their email under Test users. ` +
        'Wait for their answer before calling ga_login; otherwise Google shows "Access blocked".',
    );
    next = '6';
  } else if (webFiles.length) {
    out.push(
      `Found ${webFiles[0]}, but it is a "Web application" client. It must be a "Desktop app". ` +
        'Help the user create a new client with type Desktop app (step 5) and delete the wrong file.',
    );
    next = '5';
  } else {
    out.push('Not set up yet: no OAuth client file found in Downloads or Desktop, and not signed in.');
    next = 'start';
  }
  return `${GUIDE_RULES}\n\nCURRENT STATE: ${out.join('\n')}\n\n${renderStep(byId(next), { project })}`;
}
