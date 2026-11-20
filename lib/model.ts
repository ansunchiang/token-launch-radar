import { farmPlan } from './farm.ts';
import { calibrate, estimate, MODEL } from './valuation.ts';

export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

const PRODUCT_CATEGORIES = new Set([
  'Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'CEX', 'Liquid Staking',
  'Liquid Restaking', 'Restaked BTC', 'Anchor BTC', 'Decentralized BTC',
]);
const PRODUCT_NAME = /\b(wrapped|staked|staking|pre-launch)\b|\s(v\d+(\.\d+)?|\d+\.\d+)$/i;
const EXCHANGE_NAME = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

export function recordsToken(p: Protocol): boolean {
  return p.gecko_id !== null || p.symbol !== null || p.mcap_usd !== null;
}

export function comparableProduct(p: Protocol): boolean {
  return !PRODUCT_CATEGORIES.has(p.category ?? '') && !PRODUCT_NAME.test(p.name) && !EXCHANGE_NAME.test(p.name);
}

export function parseSnapshot(text: string): Snapshot {
  const s: Snapshot = JSON.parse(text);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.as_of) || !Number.isFinite(Date.parse(s.as_of)) ||
      typeof s.source !== 'string' || !Number.isSafeInteger(s.floor_usd) || s.floor_usd < 1 ||
      !Array.isArray(s.protocols) || !Array.isArray(s.watchlist)) {
    throw new Error('Invalid snapshot metadata');
  }
  const slugs = new Set<string>();
  const textOrNull = (v: unknown) => v === null || typeof v === 'string';
  const numberOrNull = (v: unknown) => v === null || Number.isFinite(v);
  for (const p of s.protocols) {
    if (!p || typeof p.slug !== 'string' || !/^\S{1,128}$/.test(p.slug) || slugs.has(p.slug) ||
        typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.chains) ||
        !p.chains.every((chain) => typeof chain === 'string') || !Number.isSafeInteger(p.tvl_usd) || p.tvl_usd < 1 ||
        !textOrNull(p.category) || !textOrNull(p.listed_at) || !textOrNull(p.symbol) || !textOrNull(p.gecko_id) ||
        !numberOrNull(p.change_7d) || !numberOrNull(p.mcap_usd)) {
      throw new Error(`Invalid or duplicate protocol: ${p?.slug}`);
    }
    slugs.add(p.slug);
  }
  if (new Set(s.watchlist).size !== s.watchlist.length || s.watchlist.some((slug) => !slugs.has(slug))) {
    throw new Error('Watchlist must contain unique snapshot slugs');
  }
  return s;
}

export function buildRadar(snapshot: Snapshot) {
  const watch = new Set(snapshot.watchlist);
  const recorded = snapshot.protocols.filter(recordsToken);
  const tokenSlugs = new Set(recorded.map((p) => p.slug));
  const market = calibrate(recorded.filter(comparableProduct));
  const rows = snapshot.protocols.filter((p) => {
    if (watch.has(p.slug)) {
      if (recordsToken(p)) throw new Error(`Watchlist record contains a token: ${p.slug}`);
      return true;
    }
    // Parent metadata is absent. Screen only recognizable variants of recorded slugs.
    const possibleSibling = p.slug.split('-').slice(0, -1)
      .some((_, i, parts) => tokenSlugs.has(parts.slice(0, i + 1).join('-')));
    return p.tvl_usd < snapshot.floor_usd && !recordsToken(p) && comparableProduct(p) && !possibleSibling;
  }).map((p) => {
    const model = estimate(p, snapshot.as_of, market);
    const plan = farmPlan(p);
    return {
      ...p,
      watchlist: watch.has(p.slug),
      implied_value_usd: model.value,
      model,
      route: plan.route,
      farm_steps: plan.steps,
    };
  }).sort((a, b) => b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : 1))
    .map((row, i) => ({ rank: i + 1, ...row }));

  return {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    universe: snapshot.protocols.length,
    watchlist_size: watch.size,
    settings: MODEL,
    calibration: market.global,
    rows,
    recorded: recorded.sort((a, b) => (b.mcap_usd ?? -1) - (a.mcap_usd ?? -1) || b.tvl_usd - a.tvl_usd),
  };
}

export type Radar = ReturnType<typeof buildRadar>;

export function validateBoard(radar: Radar): void {
  const { rows } = radar;
  if (rows.length < 100 || rows.length > 4000 || rows.filter((row) => row.watchlist).length !== radar.watchlist_size) {
    throw new Error('Board count or watchlist coverage is outside the gate');
  }
  if (new Set(rows.map((r) => r.slug)).size !== rows.length ||
      rows[0].implied_value_usd === rows.at(-1)?.implied_value_usd) {
    throw new Error('Board contains duplicate slugs or a flat ranking');
  }
  rows.forEach((row, i) => {
    const value = row.implied_value_usd;
    if (row.rank !== i + 1 || !Number.isSafeInteger(value) || value < 1 || value > 1e14 ||
        (i > 0 && value > rows[i - 1].implied_value_usd)) throw new Error(`Invalid ranking: ${row.slug}`);
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12 ||
        row.farm_steps.some((step) => step.trim().length < 20 || step.trim().length > 600)) {
      throw new Error(`Invalid farm plan: ${row.slug}`);
    }
  });
}
