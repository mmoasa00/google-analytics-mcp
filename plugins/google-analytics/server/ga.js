// Thin client for the GA4 Admin and Data REST APIs (read-only).

import { getAccessToken, clearCachedToken } from './auth.js';

const ADMIN = 'https://analyticsadmin.googleapis.com/v1beta';
const DATA = 'https://analyticsdata.googleapis.com/v1beta';
const DATA_ALPHA = 'https://analyticsdata.googleapis.com/v1alpha';

async function request(method, url, body, retried = false) {
  const auth = await getAccessToken();
  const headers = { authorization: `Bearer ${auth.token}` };
  if (auth.quotaProject) headers['x-goog-user-project'] = auth.quotaProject;
  if (body) headers['content-type'] = 'application/json';

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !retried) {
    clearCachedToken();
    return request(method, url, body, true);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.error?.message || res.statusText;
    let hint = '';
    if (res.status === 403 && /has not been used|is disabled/i.test(msg)) {
      hint = ' Enable the Google Analytics Admin API and Data API in your Google Cloud project.';
    } else if (res.status === 403) {
      hint = ' The signed-in Google account may not have access to this property.';
    }
    throw new Error(`Google Analytics API error ${res.status}: ${msg}${hint}`);
  }
  return json;
}

export const propertyName = (id) => {
  const s = String(id ?? '').trim();
  if (!s) throw new Error('property_id is required (e.g. "123456789"). Use list_accounts to find it.');
  return s.startsWith('properties/') ? s : `properties/${s}`;
};

async function listAll(url, key) {
  const items = [];
  let pageToken;
  do {
    const u = new URL(url);
    u.searchParams.set('pageSize', '200');
    if (pageToken) u.searchParams.set('pageToken', pageToken);
    const page = await request('GET', u.toString());
    items.push(...(page[key] || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

export async function listAccounts() {
  const summaries = await listAll(`${ADMIN}/accountSummaries`, 'accountSummaries');
  return summaries.map((a) => ({
    account_id: a.account?.replace('accounts/', ''),
    account_name: a.displayName,
    properties: (a.propertySummaries || []).map((p) => ({
      property_id: p.property?.replace('properties/', ''),
      name: p.displayName,
      type: p.propertyType,
    })),
  }));
}

export async function getProperty(id) {
  const name = propertyName(id);
  const parts = {
    property: request('GET', `${ADMIN}/${name}`),
    data_streams: listAll(`${ADMIN}/${name}/dataStreams`, 'dataStreams'),
    key_events: listAll(`${ADMIN}/${name}/keyEvents`, 'keyEvents'),
    google_ads_links: listAll(`${ADMIN}/${name}/googleAdsLinks`, 'googleAdsLinks'),
  };
  const out = {};
  for (const [key, promise] of Object.entries(parts)) {
    try {
      out[key] = await promise;
    } catch (err) {
      out[key] = { error: err.message };
    }
  }
  return out;
}

export async function getMetadata(id, search) {
  const meta = await request('GET', `${DATA}/${propertyName(id)}/metadata`);
  const q = search?.toLowerCase();
  const pick = (items) =>
    (items || [])
      .filter((f) => !q || [f.apiName, f.uiName, f.category, f.description].some((v) => v?.toLowerCase().includes(q)))
      .map((f) => ({
        api_name: f.apiName,
        ui_name: f.uiName,
        category: f.category,
        ...(f.customDefinition ? { custom: true } : {}),
        ...(f.type ? { type: f.type } : {}),
      }));
  return { dimensions: pick(meta.dimensions), metrics: pick(meta.metrics) };
}

const toNames = (list) => (list || []).map((x) => (typeof x === 'string' ? { name: x } : x));

// Flattens a runReport-style response into columns + rows to keep output small.
export function compactReport(r) {
  const dims = (r.dimensionHeaders || []).map((h) => h.name);
  const mets = (r.metricHeaders || []).map((h) => h.name);
  const row = (x) => [
    ...(x.dimensionValues || []).map((v) => v.value),
    ...(x.metricValues || []).map((v) => v.value),
  ];
  const out = { row_count: r.rowCount ?? 0, columns: [...dims, ...mets], rows: (r.rows || []).map(row) };
  if (r.totals?.length) out.totals = r.totals.map(row);
  if (r.metadata && Object.keys(r.metadata).length) out.metadata = r.metadata;
  if (r.propertyQuota) out.quota = r.propertyQuota;
  return out;
}

export async function runReport(a) {
  const body = {
    dimensions: toNames(a.dimensions),
    metrics: toNames(a.metrics),
    dateRanges: a.date_ranges?.length ? a.date_ranges : [{ startDate: '28daysAgo', endDate: 'yesterday' }],
    limit: a.limit ?? 1000,
  };
  if (a.dimension_filter) body.dimensionFilter = a.dimension_filter;
  if (a.metric_filter) body.metricFilter = a.metric_filter;
  if (a.order_bys) body.orderBys = a.order_bys;
  if (a.offset) body.offset = a.offset;
  if (a.metric_aggregations) body.metricAggregations = a.metric_aggregations;
  if (a.keep_empty_rows) body.keepEmptyRows = true;
  if (a.currency_code) body.currencyCode = a.currency_code;
  body.returnPropertyQuota = true;
  return compactReport(await request('POST', `${DATA}/${propertyName(a.property_id)}:runReport`, body));
}

export async function runRealtimeReport(a) {
  const body = {
    dimensions: toNames(a.dimensions),
    metrics: toNames(a.metrics?.length ? a.metrics : ['activeUsers']),
    limit: a.limit ?? 1000,
  };
  if (a.dimension_filter) body.dimensionFilter = a.dimension_filter;
  if (a.metric_filter) body.metricFilter = a.metric_filter;
  if (a.order_bys) body.orderBys = a.order_bys;
  if (a.minute_ranges) body.minuteRanges = a.minute_ranges;
  if (a.metric_aggregations) body.metricAggregations = a.metric_aggregations;
  return compactReport(await request('POST', `${DATA}/${propertyName(a.property_id)}:runRealtimeReport`, body));
}

export function runPivotReport(a) {
  return request('POST', `${DATA}/${propertyName(a.property_id)}:runPivotReport`, a.request);
}

export function runFunnelReport(a) {
  return request('POST', `${DATA_ALPHA}/${propertyName(a.property_id)}:runFunnelReport`, a.request);
}

export async function batchRunReports(a) {
  const res = await request('POST', `${DATA}/${propertyName(a.property_id)}:batchRunReports`, {
    requests: a.requests,
  });
  return (res.reports || []).map(compactReport);
}
