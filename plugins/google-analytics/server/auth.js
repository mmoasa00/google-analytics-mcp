// Google credentials for the Analytics APIs, using only Node built-ins.
// Sources, in order: service account / authorized-user key from env,
// a token saved by `login`, then gcloud Application Default Credentials.

import { createServer } from 'node:http';
import { randomBytes, createHash, createSign } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid',
  'email',
];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export const CONFIG_DIR =
  process.env.GA_MCP_CONFIG_DIR ||
  (platform() === 'win32'
    ? join(process.env.APPDATA || homedir(), 'ga-mcp')
    : join(homedir(), '.config', 'ga-mcp'));
const CLIENT_FILE = join(CONFIG_DIR, 'oauth-client.json');
const TOKEN_FILE = join(CONFIG_DIR, 'token.json');
const SERVICE_ACCOUNT_FILE = join(CONFIG_DIR, 'service-account.json');
const BUNDLED_CLIENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'oauth-client.json');
const GCLOUD_ADC =
  platform() === 'win32'
    ? join(process.env.APPDATA || homedir(), 'gcloud', 'application_default_credentials.json')
    : join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');

export class NotAuthenticatedError extends Error {}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Could not read ${path}: ${err.message}`);
  }
}

async function writePrivateJson(path, data) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 });
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// ---------- OAuth client (the "app" users sign in through) ----------

function parseClient(json) {
  if (json?.web) {
    throw new Error(
      'This OAuth client is a "Web application". It must be a "Desktop app": in Google Cloud go to ' +
        'Google Auth Platform → Clients → Create client → Application type "Desktop app", then download the new JSON.',
    );
  }
  const c = json?.installed || json;
  if (!c?.client_id || c.client_id.startsWith('YOUR_')) return null;
  return {
    client_id: c.client_id,
    client_secret: c.client_secret || '',
    ...(c.project_id ? { project_id: c.project_id } : {}),
  };
}

// Google names downloads client_secret_<id>.apps.googleusercontent.com.json. Newest first.
// `web` lists files of the wrong client type so setup can explain the mistake.
export async function scanDownloadedClientFiles() {
  const found = [];
  const web = [];
  for (const dir of [join(homedir(), 'Downloads'), join(homedir(), 'Desktop')]) {
    let names;
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/^client_secret.*\.json$/i.test(name)) continue;
      const path = join(dir, name);
      try {
        const json = await readJson(path);
        const mtime = (await stat(path)).mtimeMs;
        if (json?.installed?.client_id) found.push({ path, mtime });
        else if (json?.web?.client_id) web.push(path);
      } catch {
        // unreadable or not JSON: ignore
      }
    }
  }
  return { desktop: found.sort((a, b) => b.mtime - a.mtime).map((f) => f.path), web };
}

export async function readClientProject(path) {
  if (!path) return null;
  try {
    return parseClient(await readJson(path))?.project_id || null;
  } catch {
    return null;
  }
}

export async function findDownloadedClientFiles() {
  return (await scanDownloadedClientFiles()).desktop;
}

export async function loadClient() {
  if (process.env.GA_OAUTH_CLIENT_ID) {
    return {
      client_id: process.env.GA_OAUTH_CLIENT_ID,
      client_secret: process.env.GA_OAUTH_CLIENT_SECRET || '',
      source: 'environment',
    };
  }
  for (const [path, source] of [[CLIENT_FILE, CLIENT_FILE], [BUNDLED_CLIENT, 'bundled oauth-client.json']]) {
    const client = parseClient(await readJson(path));
    if (client) return { ...client, source };
  }
  return null;
}

export async function importClientFile(path) {
  const client = parseClient(await readJson(path));
  if (!client) throw new Error(`${path} is not a Google OAuth client file. Download it again from Google Auth Platform → Clients.`);
  await writePrivateJson(CLIENT_FILE, { installed: client });
  return client;
}

// ---------- Access tokens ----------

let cached = null; // { token, expiresAt, source, email, quotaProject }

async function postToken(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error_description || body.error || res.statusText;
    if (body.error === 'invalid_grant') {
      throw new NotAuthenticatedError(
        `Google rejected the saved credentials (${msg}). If you signed in with ga_login, run it again. ` +
          'If this happens about every 7 days, the app is in Testing mode: publish it (Google Auth Platform → ' +
          'Audience → Publish app) or use a service account to stay connected. ' +
          'If you use a key file, check that it is valid.',
      );
    }
    throw new Error(`Google token request failed: ${msg}`);
  }
  return body;
}

function refreshUser(cred) {
  return postToken({
    grant_type: 'refresh_token',
    client_id: cred.client_id,
    client_secret: cred.client_secret || '',
    refresh_token: cred.refresh_token,
  });
}

function serviceAccountToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope: SCOPES[0], aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key.private_key, 'base64url');
  return postToken({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${header}.${claims}.${signature}`,
  });
}

async function findCredentials() {
  const envPath = process.env.GA_CREDENTIALS_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath) {
    const cred = await readJson(envPath);
    if (!cred) throw new Error(`Credentials file not found: ${envPath}`);
    return { cred, source: envPath };
  }
  const sa = await readJson(SERVICE_ACCOUNT_FILE);
  if (sa?.type === 'service_account') return { cred: sa, source: 'service account (ga_login)' };
  const saved = await readJson(TOKEN_FILE);
  if (saved?.refresh_token) return { cred: saved, source: 'ga_login' };
  const adc = await readJson(GCLOUD_ADC);
  if (adc) return { cred: adc, source: 'gcloud application-default' };
  return null;
}

export async function getAccessToken({ force = false } = {}) {
  if (!force && cached && cached.expiresAt - 60_000 > Date.now()) return cached;
  const found = await findCredentials();
  if (!found) {
    throw new NotAuthenticatedError(
      'Not signed in to Google Analytics. Call ga_setup to see what the user still needs to do ' +
        '(it guides them step by step), or ga_login if they already have an OAuth client file.',
    );
  }
  const { cred, source } = found;
  let res;
  if (cred.type === 'service_account') res = await serviceAccountToken(cred);
  else if (cred.refresh_token) res = await refreshUser(cred);
  else throw new Error(`Unsupported credential type "${cred.type}" in ${source}.`);

  cached = {
    token: res.access_token,
    expiresAt: Date.now() + (res.expires_in || 3600) * 1000,
    source,
    email: cred.client_email || cred.email || null,
    quotaProject: process.env.GA_QUOTA_PROJECT || process.env.GOOGLE_PROJECT_ID || cred.quota_project_id || null,
  };
  return cached;
}

export function clearCachedToken() {
  cached = null;
}

// ---------- Browser sign-in (loopback + PKCE) ----------

let pendingLogin = null; // { url, promise }

function openBrowser(url) {
  const [cmd, args] =
    platform() === 'darwin'
      ? ['open', [url]]
      : platform() === 'win32'
        ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // The URL is also returned to the caller, so a failed launch is not fatal.
  }
}

const PAGE = (title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="font-family:system-ui;max-width:32rem;margin:15vh auto;text-align:center">` +
  `<h2>${title}</h2><p>${text}</p></body>`;

function decodeIdTokenEmail(idToken) {
  try {
    return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).email || null;
  } catch {
    return null;
  }
}

function startLogin(client, { timeoutMs = 10 * 60_000 } = {}) {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(16));
  const server = createServer();

  let resolveUrl;
  const urlReady = new Promise((r) => (resolveUrl = r));

  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Sign-in timed out. Run ga_login again.'));
    }, timeoutMs);
    const finish = (err, value) => {
      clearTimeout(timer);
      setTimeout(() => server.close(), 500);
      err ? reject(err) : resolve(value);
    };

    server.on('request', async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/') return res.writeHead(404).end();
      const send = (status, title, text) =>
        res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE(title, text));

      if (url.searchParams.get('state') !== state) return send(400, 'Invalid request', 'State mismatch.');
      const error = url.searchParams.get('error');
      if (error) {
        const why =
          error === 'access_denied'
            ? 'Sign-in was cancelled or blocked. If Google said "Access blocked", the app is in Testing mode and ' +
              'this email is not a test user: publish the app or add the email under Google Auth Platform → Audience.'
            : `Google returned: ${error}`;
        send(400, 'Sign-in not completed', why);
        return finish(new Error(why));
      }
      try {
        const port = server.address().port;
        const tokens = await postToken({
          grant_type: 'authorization_code',
          code: url.searchParams.get('code'),
          client_id: client.client_id,
          client_secret: client.client_secret,
          redirect_uri: `http://127.0.0.1:${port}`,
          code_verifier: verifier,
        });
        if (!String(tokens.scope || '').includes(SCOPES[0])) {
          throw new Error(
            'Google Analytics access was not granted: the box "See and download your Google Analytics data" ' +
              'was not ticked. Run ga_login again and tick that box on the consent screen.',
          );
        }
        if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Try ga_login again.');
        const email = decodeIdTokenEmail(tokens.id_token || '');
        await writePrivateJson(TOKEN_FILE, {
          type: 'authorized_user',
          client_id: client.client_id,
          client_secret: client.client_secret,
          refresh_token: tokens.refresh_token,
          email,
        });
        await rm(SERVICE_ACCOUNT_FILE, { force: true });
        clearCachedToken();
        send(200, 'Connected to Google Analytics', 'You can close this tab and return to Claude.');
        finish(null, { email });
      } catch (err) {
        send(500, 'Sign-in failed', err.message);
        finish(err);
      }
    });

    server.on('error', (err) => finish(err));
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const params = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: `http://127.0.0.1:${port}`,
        response_type: 'code',
        scope: SCOPES.join(' '),
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      resolveUrl(`${AUTH_URL}?${params}`);
    });
  });

  return { urlReady, promise };
}

/**
 * Opens the Google sign-in page and waits up to waitMs for it to complete.
 * If it is not finished in time, the listener keeps running so a later call can pick it up.
 */
export async function login({ clientFile, waitMs = 120_000, open = true } = {}) {
  if (clientFile) {
    const json = await readJson(clientFile);
    if (!json) throw new Error(`File not found: ${clientFile}`);
    if (json.type === 'service_account') return useServiceAccount(json);
    await importClientFile(clientFile);
  }
  if (!pendingLogin) {
    let client = await loadClient();
    if (!client) {
      const [downloaded] = await findDownloadedClientFiles();
      if (downloaded) {
        await importClientFile(downloaded);
        client = await loadClient();
      }
    }
    if (!client) {
      const { web } = await scanDownloadedClientFiles();
      if (web.length) parseClient({ web: {} }); // throws the "must be a Desktop app" explanation
      throw new Error(
        'No Google OAuth client file found (looked for client_secret_*.json in Downloads and Desktop). ' +
          'Call ga_setup to walk the user through creating one step by step, or pass client_secret_file ' +
          'if the file is somewhere else.',
      );
    }
    const { urlReady, promise } = startLogin(client);
    const url = await urlReady;
    pendingLogin = { url, promise };
    promise.then(
      () => (pendingLogin = null),
      () => (pendingLogin = null),
    );
    if (open) openBrowser(url);
    process.stderr.write(`[google-analytics] Sign in at: ${url}\n`);
  }
  const { url, promise } = pendingLogin;
  const timeout = new Promise((r) => setTimeout(() => r({ pending: true }), waitMs));
  const result = await Promise.race([promise, timeout]);
  return result.pending ? { pending: true, url } : { pending: false, email: result.email };
}

// Service accounts need no browser and never expire; the account's email must be a Viewer in GA.
async function useServiceAccount(key) {
  if (!key.client_email || !key.private_key) throw new Error('This service account key file is incomplete.');
  try {
    await serviceAccountToken(key); // fails early if the key is invalid or disabled
  } catch (err) {
    throw new Error(
      `Google rejected this service account key (${err.message.match(/\(([^)]*)\)/)?.[1] || err.message}). ` +
        'Make sure the key was not deleted and the service account still exists, or create a new key.',
    );
  }
  await writePrivateJson(SERVICE_ACCOUNT_FILE, key);
  await rm(TOKEN_FILE, { force: true });
  clearCachedToken();
  return { pending: false, email: key.client_email, serviceAccount: true };
}

export async function logout() {
  await rm(SERVICE_ACCOUNT_FILE, { force: true });
  await rm(TOKEN_FILE, { force: true });
  clearCachedToken();
}

export async function status() {
  const found = await findCredentials();
  if (!found) return { signedIn: false, client: (await loadClient())?.source || null };
  const tok = await getAccessToken();
  return { signedIn: true, source: tok.source, email: tok.email, quotaProject: tok.quotaProject };
}
