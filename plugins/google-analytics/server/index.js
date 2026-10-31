#!/usr/bin/env node
// Google Analytics MCP server (stdio, zero dependencies).
//   node index.js            -> run as an MCP server
//   node index.js setup [step] | guide | login [client.json] | status | logout

import { createInterface } from 'node:readline';
import * as auth from './auth.js';
import * as ga from './ga.js';
import { setupState, renderGuide } from './setup.js';

const VERSION = '1.0.0';
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const json = (v) => JSON.stringify(v, null, 1);
const prop = { type: 'string', description: 'GA4 property ID, e.g. "123456789" (from list_accounts).' };
const nameList = (what) => ({
  type: 'array',
  items: { type: 'string' },
  description: `${what} API names, e.g. ${what === 'Dimension' ? '["date", "sessionDefaultChannelGroup"]' : '["activeUsers", "sessions"]'}. Use get_metadata to discover names, including custom ones.`,
});
const filter = (what) => ({
  type: 'object',
  description: `GA4 Data API ${what} FilterExpression JSON, e.g. {"filter":{"fieldName":"country","stringFilter":{"value":"Germany"}}}. Supports andGroup / orGroup / notExpression.`,
});
const orderBys = {
  type: 'array',
  items: { type: 'object' },
  description: 'GA4 OrderBy list, e.g. [{"metric":{"metricName":"sessions"},"desc":true}].',
};

const TOOLS = [
  {
    name: 'ga_setup',
    description:
      'Step-by-step setup guide for connecting Google Analytics. Checks what is already done (client file, sign-in, API access) and returns the exact next step with links, buttons to click and fixes for common errors. Call this first when the user wants to set up or connect Google Analytics, when they are stuck, or after each step to verify it.',
    inputSchema: {
      type: 'object',
      properties: {
        step: {
          type: 'string',
          description: 'Optional: get one specific step instead of auto-detecting (start, teammate, 1-7).',
        },
      },
    },
    run: async (a) => setupState(a.step),
  },
  {
    name: 'ga_login',
    description:
      'Sign in to Google Analytics with Google (opens a browser window). Finds a downloaded client_secret_*.json in Downloads/Desktop automatically. If no client file exists yet, use ga_setup instead to guide the user.',
    inputSchema: {
      type: 'object',
      properties: {
        client_secret_file: {
          type: 'string',
          description: 'Optional path to a downloaded Google OAuth "Desktop app" client JSON. Needed only the first time if no client is configured.',
        },
        wait_seconds: { type: 'number', description: 'How long to wait for the user to finish signing in (default 120).' },
      },
    },
    run: async (a) => {
      const r = await auth.login({ clientFile: a.client_secret_file, waitMs: (a.wait_seconds ?? 120) * 1000 });
      return r.pending
        ? `Waiting for sign-in. A browser window should have opened; if not, open this URL:\n${r.url}\nAfter signing in, call ga_auth_status (or ga_login again) to confirm.`
        : `Signed in to Google Analytics${r.email ? ` as ${r.email}` : ''}.`;
    },
  },
  {
    name: 'ga_auth_status',
    description: 'Show whether Google Analytics is connected and which Google account or credential is used.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => json(await auth.status()),
  },
  {
    name: 'ga_logout',
    description: 'Disconnect the Google account saved by ga_login on this computer.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => (await auth.logout(), 'Signed out. Saved Google token removed.'),
  },
  {
    name: 'list_accounts',
    description: 'List every Google Analytics account and GA4 property the signed-in user can access. Start here to find property IDs.',
    inputSchema: { type: 'object', properties: {} },
    run: async () => json(await ga.listAccounts()),
  },
  {
    name: 'get_property',
    description: 'Details for one GA4 property: settings (time zone, currency, industry), data streams (websites/apps), key events (conversions) and linked Google Ads accounts.',
    inputSchema: { type: 'object', properties: { property_id: prop }, required: ['property_id'] },
    run: async (a) => json(await ga.getProperty(a.property_id)),
  },
  {
    name: 'get_metadata',
    description: 'List the dimensions and metrics available for a property (standard and custom). Optionally filter by a search term like "revenue" or "page".',
    inputSchema: {
      type: 'object',
      properties: { property_id: prop, search: { type: 'string', description: 'Optional case-insensitive filter.' } },
      required: ['property_id'],
    },
    run: async (a) => json(await ga.getMetadata(a.property_id, a.search)),
  },
  {
    name: 'run_report',
    description: 'Run a GA4 report (Data API runReport): any combination of dimensions and metrics over date ranges, with filters, sorting and paging. Returns columns + rows.',
    inputSchema: {
      type: 'object',
      properties: {
        property_id: prop,
        dimensions: nameList('Dimension'),
        metrics: nameList('Metric'),
        date_ranges: {
          type: 'array',
          items: {
            type: 'object',
            properties: { startDate: { type: 'string' }, endDate: { type: 'string' }, name: { type: 'string' } },
          },
          description: 'Dates as YYYY-MM-DD, "today", "yesterday" or "NdaysAgo". Pass two ranges to compare periods. Default: last 28 days.',
        },
        dimension_filter: filter('dimension'),
        metric_filter: filter('metric'),
        order_bys: orderBys,
        limit: { type: 'number', description: 'Max rows (default 1000, max 250000).' },
        offset: { type: 'number', description: 'Row offset for paging.' },
        metric_aggregations: { type: 'array', items: { type: 'string', enum: ['TOTAL', 'MAXIMUM', 'MINIMUM', 'COUNT'] } },
        keep_empty_rows: { type: 'boolean' },
        currency_code: { type: 'string', description: 'ISO 4217 code, e.g. "USD".' },
      },
      required: ['property_id', 'metrics'],
    },
    run: async (a) => json(await ga.runReport(a)),
  },
  {
    name: 'run_realtime_report',
    description: 'Realtime GA4 report: activity in the last 30 minutes (60 for GA360). Useful dimensions: country, city, deviceCategory, unifiedScreenName, eventName, minutesAgo.',
    inputSchema: {
      type: 'object',
      properties: {
        property_id: prop,
        dimensions: nameList('Dimension'),
        metrics: nameList('Metric'),
        dimension_filter: filter('dimension'),
        metric_filter: filter('metric'),
        order_bys: orderBys,
        minute_ranges: { type: 'array', items: { type: 'object' }, description: 'e.g. [{"startMinutesAgo":29,"endMinutesAgo":0}]' },
        metric_aggregations: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number' },
      },
      required: ['property_id'],
    },
    run: async (a) => json(await ga.runRealtimeReport(a)),
  },
  {
    name: 'batch_run_reports',
    description: 'Run up to 5 reports for one property in a single call. Each request is a raw GA4 RunReportRequest object (camelCase: dimensions, metrics, dateRanges, dimensionFilter, orderBys, limit).',
    inputSchema: {
      type: 'object',
      properties: { property_id: prop, requests: { type: 'array', items: { type: 'object' }, maxItems: 5 } },
      required: ['property_id', 'requests'],
    },
    run: async (a) => json(await ga.batchRunReports(a)),
  },
  {
    name: 'run_pivot_report',
    description: 'Run a GA4 pivot report. `request` is a raw RunPivotReportRequest (dimensions, metrics, dateRanges, pivots, filters).',
    inputSchema: {
      type: 'object',
      properties: { property_id: prop, request: { type: 'object' } },
      required: ['property_id', 'request'],
    },
    run: async (a) => json(await ga.runPivotReport(a)),
  },
  {
    name: 'run_funnel_report',
    description: 'Run a GA4 funnel report (Data API v1alpha). `request` is a raw RunFunnelReportRequest with funnel.steps, dateRanges, optional funnelBreakdown.',
    inputSchema: {
      type: 'object',
      properties: { property_id: prop, request: { type: 'object' } },
      required: ['property_id', 'request'],
    },
    run: async (a) => json(await ga.runFunnelReport(a)),
  },
];

const INSTRUCTIONS =
  'Read-only access to Google Analytics 4. Call list_accounts first to find property IDs. ' +
  'If the user is not set up or not signed in, call ga_setup and guide them one step at a time. ' +
  'Use get_metadata to find valid dimension and metric names.';

// ---------- JSON-RPC over stdio ----------

const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

async function callTool(params) {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return { content: [{ type: 'text', text: `Unknown tool: ${params?.name}` }], isError: true };
  try {
    return { content: [{ type: 'text', text: await tool.run(params.arguments || {}) }] };
  } catch (err) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification
  switch (method) {
    case 'initialize':
      return send({
        id,
        result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'google-analytics', version: VERSION },
          instructions: INSTRUCTIONS,
        },
      });
    case 'ping':
      return send({ id, result: {} });
    case 'tools/list':
      return send({ id, result: { tools: TOOLS.map(({ run, ...t }) => t) } });
    case 'tools/call':
      return send({ id, result: await callTool(params) });
    case 'resources/list':
      return send({ id, result: { resources: [] } });
    case 'prompts/list':
      return send({ id, result: { prompts: [] } });
    default:
      return send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

function serve() {
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return send({ id: null, error: { code: -32700, message: 'Parse error' } });
    }
    handle(msg).catch((err) => msg.id != null && send({ id: msg.id, error: { code: -32603, message: err.message } }));
  });
  rl.on('close', () => process.exit(0));
}

// ---------- CLI ----------

async function cli(cmd, arg) {
  try {
    if (cmd === 'login') {
      const r = await auth.login({ clientFile: arg, waitMs: 10 * 60_000 });
      console.error(r.pending ? 'Sign-in timed out.' : `Signed in${r.email ? ` as ${r.email}` : ''}.`);
      process.exit(r.pending ? 1 : 0);
    } else if (cmd === 'guide') {
      process.stdout.write(renderGuide() + '\n');
    } else if (cmd === 'setup') {
      process.stdout.write((await setupState(arg)) + '\n');
    } else if (cmd === 'status') {
      console.error(json(await auth.status()));
    } else if (cmd === 'logout') {
      await auth.logout();
      console.error('Signed out.');
    } else {
      console.error('Usage: node index.js [setup [step] | guide | login [client.json] | status | logout]');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

const [cmd, arg] = process.argv.slice(2);
cmd ? cli(cmd, arg) : serve();
