import type { Protocol } from './model.ts';

export const MODEL = {
  familyPrior: 8,
  categoryPrior: 8,
  marketNeighbors: 32,
  growthLimit: 30,
  growthWeight: .35,
  breadthWeight: .045,
  breadthLimit: 8,
  maturityDays: 730,
  maturityFloor: .85,
  maturitySpan: .25,
};

const GROUPS: Record<string, string[]> = {
  'Credit & collateral': ['Lending', 'Uncollateralized Lending', 'CDP', 'CDP Manager', 'Collateral Management', 'Collateral Markets'],
  'Managed yield': ['Risk Curators', 'Onchain Capital Allocator', 'Yield', 'Yield Aggregator', 'Farm', 'Leveraged Farming', 'Basis Trading', 'Liquidity Manager', 'CeDeFi', 'Options Vault', 'Restaking', 'Staking Pool'],
  'Markets & trading': ['Dexs', 'Derivatives', 'Interest Rate Derivatives', 'Prediction Market', 'Launchpad', 'NFT Marketplace', 'Options', 'Synthetics', 'OTC Marketplace', 'Indexes'],
  'Assets & payments': ['RWA', 'Stablecoin Issuer', 'Stablecoin Wrapper', 'Dual-Token Stablecoin', 'Algo-Stables', 'Payments', 'Crypto Card Issuer', 'Reserve Currency', 'Insurance'],
  'Network services': ['Chain', 'Governance Incentives', 'Token Locker', 'Decentralized AI', 'AI Agents', 'Privacy', 'DOR'],
};
const familyFor = new Map(Object.entries(GROUPS).flatMap(([family, categories]) => categories.map((category) => [category, family])));

type Multiple = { low: number; mid: number; high: number; n: number };
type Peer = { slug: string; name: string; symbol: string | null; tvl: number; mcap: number; ratio: number };

function quartiles(peers: Peer[]): Multiple | null {
  if (!peers.length) return null;
  const logs = peers.map((p) => Math.log(p.ratio)).sort((a, b) => a - b);
  const at = (q: number) => {
    const i = (logs.length - 1) * q;
    const a = logs[Math.floor(i)];
    return Math.exp(a + (logs[Math.ceil(i)] - a) * (i % 1));
  };
  return { low: at(.25), mid: at(.5), high: at(.75), n: peers.length };
}

function shrink(local: Multiple | null, prior: Multiple, priorSize: number): Multiple {
  if (!local) return prior;
  const w = local.n / (local.n + priorSize);
  const mix = (a: number, b: number) => Math.exp(w * Math.log(a) + (1 - w) * Math.log(b));
  return { low: mix(local.low, prior.low), mid: mix(local.mid, prior.mid), high: mix(local.high, prior.high), n: local.n };
}

export function calibrate(protocols: Protocol[]) {
  const byCategory = new Map<string, Peer[]>();
  const byFamily = new Map<string, Peer[]>();
  const pool: Peer[] = [];
  for (const p of protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0) continue;
    const category = p.category ?? 'Uncategorized';
    const family = familyFor.get(category);
    const peer = { slug: p.slug, name: p.name, symbol: p.symbol, tvl: p.tvl_usd, mcap: p.mcap_usd, ratio: p.mcap_usd / p.tvl_usd };
    pool.push(peer);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(peer);
    if (!family) continue;
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family)!.push(peer);
  }
  const global = quartiles(pool);
  if (!global) throw new Error('No recorded market caps for model calibration');
  return { pool, global, byCategory, byFamily };
}

export function estimate(p: Protocol, asOf: string, market: ReturnType<typeof calibrate>) {
  const category = p.category ?? 'Uncategorized';
  const family = familyFor.get(category) ?? 'Market';
  const direct = market.byCategory.get(category) ?? [];
  const related = (market.byFamily.get(family) ?? []).filter((peer) => !direct.includes(peer));
  const bySize = (a: Peer, b: Peer) =>
    Math.abs(Math.log(a.tvl / p.tvl_usd)) - Math.abs(Math.log(b.tvl / p.tvl_usd));
  // Separate the evidence pools so a thin category cannot vote twice.
  const marketPeers = market.pool.filter((peer) => !direct.includes(peer) && !related.includes(peer))
    .sort(bySize).slice(0, MODEL.marketNeighbors);
  const base = quartiles(marketPeers) ?? market.global;
  const prior = shrink(quartiles(related), base, MODEL.familyPrior);
  const multiple = shrink(quartiles(direct), prior, MODEL.categoryPrior);
  const days = p.listed_at ? (Date.parse(asOf) - Date.parse(p.listed_at)) / 86_400_000 : NaN;
  const age = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : null;
  const growth = (p.change_7d ?? 0) / 100;
  const cap = MODEL.growthLimit / 100;
  const growthFactor = 1 + MODEL.growthWeight * Math.max(-cap, Math.min(cap, growth));
  const breadth = new Set(p.chains).size;
  const breadthFactor = 1 + MODEL.breadthWeight * Math.log2(Math.max(1, Math.min(MODEL.breadthLimit, breadth)));
  const ageFactor = age === null ? 1 : MODEL.maturityFloor + MODEL.maturitySpan * Math.min(1, age / MODEL.maturityDays);
  const adjustedTvl = p.tvl_usd * growthFactor * breadthFactor * ageFactor;
  const dollars = (ratio: number) => Math.max(1, Math.min(1e14, Math.round(adjustedTvl * ratio)));
  const examples = [
    ...direct.slice().sort(bySize).slice(0, 3).map((peer) => ({ ...peer, group: 'Category' })),
    ...related.slice().sort(bySize).slice(0, 3).map((peer) => ({ ...peer, group: 'Related' })),
    ...marketPeers.slice(0, 4).map((peer) => ({ ...peer, group: 'Market' })),
  ].slice(0, 4);
  return {
    value: dollars(multiple.mid),
    low: dollars(multiple.low),
    high: dollars(multiple.high),
    multiple: multiple.mid,
    growthFactor, breadthFactor, ageFactor, age, breadth,
    category, family, direct: direct.length, related: related.length, market: base.n, examples,
    evidence: direct.length >= MODEL.categoryPrior ? 'Category-led' : direct.length ? 'Blended' : 'Prior-led',
  };
}
