import type { Protocol } from './model.ts';
import { ROUTES } from './routes.ts';

const NETWORKS: Record<string, [currency: string, feeBudget: string]> = {
  Ethereum: ['ETH', '$5–30'],
  Base: ['ETH on Base', '$0.25–3'],
  Arbitrum: ['ETH on Arbitrum', '$0.25–3'],
  Optimism: ['ETH on Optimism', '$0.25–3'],
  Ink: ['ETH on Ink', '$0.25–3'],
  Unichain: ['ETH on Unichain', '$0.25–3'],
  'Robinhood Chain': ['the chain’s fee asset', 'wallet quote'],
  Binance: ['BNB', '$0.20–3'],
  Solana: ['SOL', '$0.10–2 plus any account reserve'],
  Monad: ['MON', '$0.10–2'],
  Sui: ['SUI', '$0.10–2'],
  Polygon: ['POL', '$0.10–2'],
  Avalanche: ['AVAX', '$0.25–3'],
  Stellar: ['XLM', '$0.10–2 plus trustline reserve'],
  Aptos: ['APT', '$0.10–2'],
  Algorand: ['ALGO', '$0.10–2 plus minimum balance'],
  Flare: ['FLR', '$0.10–2'],
  'Plume Mainnet': ['PLUME', '$0.10–2'],
  'Hyperliquid L1': ['HYPE', 'wallet quote'],
  Tron: ['TRX or delegated energy', 'wallet energy quote'],
  Bitcoin: ['BTC', 'wallet routing and settlement quote'],
  BSquared: ['BTC on B²', 'wallet quote plus bridge fees'],
  Bittensor: ['TAO', 'wallet quote plus slippage'],
  Noble: ['the supported Noble fee asset', 'wallet quote'],
};

type Actions = [label: string, exposure: string, inspect: string, enter: string, monitor: string, exit: string];

const PLAYBOOKS: Record<string, Actions> = {
  lending: ['Supply only', 'Trial deposit',
    'Review the supply cap, bad debt disclosures and cash available to withdraw from a single reserve.',
    'Test a small supply into a supported, liquid reserve. Save the deposit receipt and leave borrowing unused.',
    'Check utilization and unborrowed liquidity. Reduce exposure if a lender withdrawal would regularly fail.',
    'Withdraw a small fraction first and verify that the token received matches your original deposit.'],
  curator: ['Curated vault', 'Trial deposit',
    'Find the curator name in a host lending app. Compare underlying markets, cap concentration and immediately withdrawable cash.',
    'Use a verified vault whose public minimum fits your budget and save its share token and deposit receipt.',
    'Compare the latest allocations with your notes and check whether incentives come from the host market or the curator.',
    'Preview and redeem a fraction of the shares, checking reported share price against the assets received.'],
  managed: ['Managed vault', 'Trial deposit',
    'Compare strategy mandate, asset, fees and settlement timing. Check who can change the strategy and whether deposits are open.',
    'Use one underlying asset in a small trial. Save the share count, NAV and vault address or program identifier.',
    'Track NAV per share after fees and compare the redemption quote with your entry. Watch for strategy or liquidity changes.',
    'Preview an exit and request a small redemption. If queued, note the settlement deadline and return to claim.'],
  yield: ['Yield position', 'Trial deposit',
    'Read the yield source and whether the product is liquid, fixed term or part of a leveraged strategy. Compare fees and exit terms.',
    'Choose a simple, unlevered position if it exists and capture the receipt together with the underlying asset and any maturity date.',
    'Check realized yield against fees. If yield depends on an incentive period, record the expiry and compare net yield after it ends.',
    'Use redemption at maturity when applicable. Compare early exit proceeds with waiting before selling any receipt in a secondary pool.'],
  basis: ['Hedged vault', 'Trial deposit + basis risk',
    'Inspect venue and custodian exposure, hedge reports, funding sources and how the vault handles sustained negative funding.',
    'Use a public vault with a small minimum and published redemption rules. Record the entry NAV and avoid adding a separate leveraged hedge.',
    'Track funding, NAV, custody disclosures and available redemption liquidity. Check whether any stable receipt has drifted from its reference.',
    'Compare redemption proceeds to secondary quotes, request a small exit and confirm final settlement before increasing exposure.'],
  rwa: ['Asset subscription', 'Minimum + issuer risk',
    'Read the issuer’s eligibility, minimum, valuation schedule and dealing window. If the asset requires approval, check it before moving funds.',
    'If eligible and the minimum fits, preview a small subscription with the supported settlement asset. Save the share or order reference.',
    'Compare reported NAV to the latest redemption terms and track issuer notices. Separate the underlying asset from any rewards campaign.',
    'Use the issuer’s redemption window, allowing for business-day settlement. Record any spread, fee or delay against the quote.'],
  dex: ['Swap trial', 'Trade amount + spread',
    'Find a deep spot pair and compare expected spread, price impact, and asset contracts against another route.',
    'Make one useful small swap with a minimum-received limit. Record actual output and the venue that executed the trade.',
    'If the position is a pool, check that the range is active and value it against holding the original assets after fees.',
    'Quote the reverse route or remove any test liquidity. Compare the exit result with your logged entry rather than repeating volume.'],
  derivatives: ['Trading review', 'Fees + margin loss',
    'Check collateral, funding cadence, liquidation rules and jurisdictional eligibility. First quote a practice order or use a demo when available.',
    'Use paper trading to record one entry and one reduce-only exit. Only consider a real order if needed for an existing hedge and the minimum fits.',
    'Check funding and collateral headroom while exposure is open. Compare quoted versus realized spread on both sides.',
    'Close any open trade with a reduce-only order and verify that open orders are canceled before withdrawing collateral.'],
  cdp: ['Collateral vault', 'Collateral + debt fees',
    'Preview one collateral type, minimum debt, liquidation threshold and stability fee before opening a vault.',
    'Use the preview to stress-test a collateral price drop. Only mint if it serves a real need and you can afford the minimum plus repayment.',
    'Track the collateral ratio and debt including accrued fees. Keep the repayment asset and native fee balance available.',
    'Repay all debt and fees, then withdraw collateral. Confirm the vault shows a zero balance and check what the route cost.'],
  restaking: ['Stake review', 'Stake + slashing risk',
    'Check the underlying asset, operator set, slashing conditions and the order in which unbonding and redemption occur.',
    'If a public stake product has a suitable minimum, test one small stake and retain its receipt and expected exit date.',
    'Watch operator notices and confirm your collateral remains withdrawable if the receipt token’s secondary price drops.',
    'Request withdrawal, wait through the contract’s unbonding window and claim via the same contract only when eligible.'],
  cash: ['Payment trial', 'Small transfer float',
    'Check supported denominations, funding route, eligibility and settlement fees before sending.',
    'Test one low-value payment or transfer you actually need and record the transaction on both sides.',
    'Confirm the recipient’s final asset and balance, and watch for a settlement or return cutoff.',
    'Keep the receipt and confirm the refund or withdrawal path before leaving any balance on the platform.'],
  chain: ['Network trial', 'Small transfer float',
    'Use the official chain docs to confirm the wallet, native fee asset and the minimum return amount on the supported bridge or transfer route.',
    'Test a small transfer and one useful application action only after the funds appear on the intended network.',
    'Confirm the destination receipt and check the bridge or transfer status before resubmitting any pending transaction.',
    'Quote the return route and allow for its finality or challenge period. Keep destination gas available until the exit finishes.'],
  insurance: ['Cover review', 'Premium or at-risk stake',
    'Check whether the product sells cover or takes deposits to underwrite risk. Read exclusions, withdrawal terms and the loss waterfall.',
    'Request an indicative cover quote or inspect the underwriting pool. Only transact if the policy or exposure fits a real need.',
    'Save the position or coverage proof and track any incident notice, claim deadline, or exit lockup.',
    'For cover, save evidence of expiry and the claims process. For underwriting, check queue and settlement before requesting withdrawal.'],
  governance: ['Incentive review', 'Quote before any lock',
    'Find the published voting or rewards epoch. Check the eligible asset and exact lock or unlock rules.',
    'Preview one genuine vote or deposit on an eligible position. If locking is required, confirm the end date before proceeding.',
    'Record your vote or position ID and monitor whether the official reward ledger credits the correct epoch.',
    'At the stated unlock time, review any eligible claim and redeem any unlocked balance from the official interface.'],
  prediction: ['Market review', 'Full stake at risk',
    'Read the resolution source and end time of one legally accessible market. Compare spread and depth on both sides.',
    'Record a simulated entry and stop at the preview unless the position serves a genuine purpose. Size any real position for total loss.',
    'Follow the resolution source and monitor the sell quote. Open interest does not guarantee the position can be closed at the displayed price.',
    'Close at a firm quote or wait for official resolution if you already entered. Verify any redemption against the final market outcome.'],
  index: ['Basket review', 'Trial deposit + spread',
    'Inspect the basket composition, rebalancing rules, fees and whether creation or redemption is open.',
    'If the basket fits your use case, check the cost to acquire one small share against its component value before proceeding.',
    'Compare basket NAV with the secondary quote and track rebalancing or fee changes.',
    'Compare direct redemption with a secondary sale net of costs and record the realized amount.'],
};

const BY_CATEGORY: Record<string, keyof typeof PLAYBOOKS> = {
  Lending: 'lending', 'Uncollateralized Lending': 'lending',
  'Risk Curators': 'curator', 'Onchain Capital Allocator': 'managed', 'Liquidity Manager': 'managed',
  Yield: 'yield', 'Yield Aggregator': 'yield', Farm: 'yield', 'Leveraged Farming': 'yield',
  'Basis Trading': 'basis', CeDeFi: 'basis',
  RWA: 'rwa', Dexs: 'dex', Derivatives: 'derivatives', Options: 'derivatives', 'Interest Rate Derivatives': 'derivatives',
  CDP: 'cdp', 'CDP Manager': 'cdp', 'Collateral Markets': 'cdp',
  Restaking: 'restaking', 'Staking Pool': 'restaking',
  'Stablecoin Wrapper': 'cash', 'Dual-Token Stablecoin': 'cash', Payments: 'cash', 'Crypto Card Issuer': 'cash',
  Chain: 'chain', Insurance: 'insurance', 'Governance Incentives': 'governance', 'Prediction Market': 'prediction', Indexes: 'index',
};

function chainFor(p: Protocol): string {
  const usable = p.chains.filter((chain) => NETWORKS[chain] && chain !== 'Ethereum');
  return usable[0] ?? p.chains[0] ?? 'its documented network';
}

export function farmPlan(p: Protocol) {
  const custom = ROUTES[p.slug];
  const chain = custom && p.chains.includes(custom.chain) ? custom.chain : chainFor(p);
  const [currency, feeBudget] = NETWORKS[chain] ?? ['the native fee asset', 'wallet quote'];
  const profile = BY_CATEGORY[p.category ?? ''] ?? 'managed';
  const [label, exposure, inspect, enter, monitor, exit] = PLAYBOOKS[profile];
  const budget = ['cash', 'chain', 'dex'].includes(profile) ? '$10–30' : '$25–100';
  const fee = feeBudget.startsWith('$') ? `${feeBudget} estimated fee reserve` : feeBudget;
  const review = p.change_7d !== null && p.change_7d < -10
    ? ' Recheck exit liquidity before entry given the snapshot’s weekly TVL drop.'
    : '';
  const cadence = ['cdp', 'derivatives', 'prediction'].includes(profile) ? '5 min daily while exposed' : '5 min at day 2 and weekly';
  const steps = [
    `Check product · ${p.name} on ${chain}. ${custom?.inspect ?? inspect}${review} | $0 · 10–15 min`,
    `Test entry · ${custom?.enter ?? enter} Keep ${currency} for fees. ${custom?.exposure ? 'Use the quoted minimum only if it fits your risk budget.' : `Use ${budget} as a trial ceiling if the minimum fits.`} | ${custom?.exposure ?? exposure} + ${fee} · 10–20 min`,
    `Monitor position · ${custom?.monitor ?? monitor} | $0 to review · ${cadence}`,
    `Rehearse exit · ${custom?.exit ?? exit} Record the proceeds and transaction IDs. | Exit quote applies · 10 min + settlement`,
    `Verify incentives · Check ${p.name}’s official terms for your chain, product and wallet. Log the eligible event and deadline if published before signing any claim. | $0 to verify · 5 min`,
  ];
  return { route: { chain, label: custom?.label ?? label, reference: custom?.reference ?? null }, steps };
}
