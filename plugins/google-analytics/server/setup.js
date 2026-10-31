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
      'Did someone on your team already send you a file named like `client_secret_….apps.googleusercontent.com.json`?',
      '**Yes** → skip to **Teammates: save the file you received**. You only need 2 minutes.',
      '**No**, or you are the first person on your team → follow steps **1 to 7**. About 10 minutes, once. Afterwards you share one file with your team.',
      'You need a Google account that can already see your data in Google Analytics (https://analytics.google.com).',
    ],
  },
  {
    id: 'teammate',
    title: 'Teammates: save the file you received',
    who: 'Teammates who received a client file',
    steps: [
      'Save the `client_secret_….json` file you received into your **Downloads** folder. Keep the name as it is.',
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
  },
  {
    id: '4',
    title: 'Allow people to sign in (External only)',
    who: 'First person on the team. Skip if you chose Internal.',
    link: 'https://console.cloud.google.com/auth/audience',
    steps: [
      'Open the link. Under **Publishing status** it says **Testing**.',
      '**Recommended:** click **Publish app**, then **Confirm**. Anyone you share with can now sign in. They will see a "Google hasn\'t verified this app" warning they click past (shown in step 6). Up to 100 people can use an unverified app.',
      '**Or** stay in Testing: under **Test users** click **Add users**, enter each person\'s Gmail address, click **Save**. Note: in Testing mode everyone has to reconnect every 7 days.',
    ],
    expect: 'Publishing status shows **In production**, or your test users are listed.',
    problems: [
      'If Google asks you to "prepare for verification", you can ignore it. Verification (free) only removes the warning screen and the 100-user limit.',
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
      'In Claude, say **"connect my Google Analytics"**. In Claude Code you can also type `/ga-connect`. Claude finds the file in your Downloads folder automatically.',
      'A browser tab opens. Choose the Google account that has access to your Google Analytics.',
      'If you see **"Google hasn\'t verified this app"**: click **Advanced** (bottom left), then **Go to GA for Claude (unsafe)**. It is your own app, so this is expected.',
      '**Important:** on the next screen, tick the box **See and download your Google Analytics data**, then click **Continue**.',
      'The tab shows **Connected to Google Analytics**. Close it and go back to Claude.',
    ],
    expect: 'Claude confirms you are signed in and lists your Google Analytics accounts.',
    problems: [
      '**"Access blocked: … has not completed the Google verification process"**: the app is in Testing and your email is not a test user. Ask the first person to do step 4.',
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
];

const byId = (id) => STEPS.find((s) => s.id === String(id));

export function renderStep(s, { heading = '###' } = {}) {
  const label = /^\d+$/.test(s.id) ? `Step ${s.id}: ${s.title}` : s.title;
  const lines = [`${heading} ${label}`, `*For: ${s.who}*`, ''];
  if (s.link) lines.push(`Link: ${s.link}`, '');
  s.steps.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  if (s.expect) lines.push('', `**You should see:** ${s.expect}`);
  if (s.problems?.length) lines.push('', '**If something goes wrong:**', ...s.problems.map((p) => `- ${p}`));
  return lines.join('\n');
}

export function renderGuide() {
  const order = ['start', 'teammate', '1', '2', '3', '4', '5', '6', '7'];
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
  'Step order for the first person: start → 1 → 2 → 3 → 4 (External only) → 5 → 6 → 7. Teammates: start → teammate → 6 → 7.';

// Works out where the user is and returns the step they should do next.
export async function setupState(stepId) {
  if (stepId) {
    const s = byId(stepId);
    if (!s) throw new Error(`Unknown step "${stepId}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
    return `${GUIDE_RULES}\n\n${renderStep(s)}`;
  }

  const client = await auth.loadClient();
  const { desktop: downloaded, web: webFiles } = client ? { desktop: [], web: [] } : await auth.scanDownloadedClientFiles();
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
    out.push('Next: explain step 6 briefly, then call ga_login.');
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
  return `${GUIDE_RULES}\n\nCURRENT STATE: ${out.join('\n')}\n\n${renderStep(byId(next))}`;
}
