export type Route = {
  chain: string;
  label: string;
  reference: string;
  inspect: string;
  enter: string;
  monitor: string;
  exit: string;
  exposure?: string;
};

// Named routes describe the product mechanics. They never affect rank or imply campaign eligibility.
export const ROUTES: Record<string, Route> = {
  'steakhouse-financial': {
    chain: 'Base', label: 'Morpho vault', reference: 'Steakhouse → Prime Instant vault docs',
    inspect: 'Open Steakhouse’s Base Prime Instant USDC listing. Check the curator, collateral mix and immediately available exit liquidity.',
    enter: 'Use Base USDC in the verified Steakhouse Prime Instant vault. Approve only the trial amount and record the share balance.',
    monitor: 'Review collateral changes, idle USDC and the share-to-USDC quote. Separate vault yield from any rewards listed by Morpho.',
    exit: 'Redeem a small share amount back to Base USDC. Check the received assets against the vault preview before redeeming the rest.',
  },
  gauntlet: {
    chain: 'Base', label: 'Morpho vault', reference: 'Morpho → Gauntlet USDC Prime vault listing',
    inspect: 'Find Gauntlet USDC Prime in Morpho on Base. Compare its utilization, exposure caps and available liquidity with Frontier.',
    enter: 'Supply Base USDC to the confirmed Prime vault and save the vault address, shares and deposit receipt.',
    monitor: 'Watch for a rise in collateral concentration or a drop in cash available to redeem. Review reward attribution by vault and chain.',
    exit: 'Preview and redeem a small number of shares into Base USDC. Delay adding capital if liquid assets cannot cover your planned exit.',
  },
  veda: {
    chain: 'Ink', label: 'BoringVault', reference: 'Veda docs → Architecture and flow of funds',
    inspect: 'Find a Veda-powered vault on Ink in the operator’s official app. Verify its Teller, accepted asset and how withdrawals settle.',
    enter: 'Use the vault’s deposit flow for the supported token. Save the share receipt and confirm whether an initial share lock applies.',
    monitor: 'Compare the Accountant’s share value with the actual withdrawal quote. Track the vault operator’s settlement notices and expiry rules.',
    exit: 'Use the withdrawal route shown by that vault. If it uses a queue, check minimum proceeds and deadline, then claim only once settlement is available.',
  },
  usdd: {
    chain: 'Tron', label: 'Stablecoin vault', reference: 'USDD docs → Open a Vault',
    inspect: 'In TronLink, preview a USDD vault using supported collateral. Write down the collateral floor, stability fee, minimum mint and TRX energy quote.',
    enter: 'If the minimum fits the budget, preview a small USDD mint with a buffer above the liquidation ratio. Check the peg and keep enough USDD to repay.',
    monitor: 'Track collateral value and accrued debt daily. Set a collateral-ratio alert above liquidation and keep TRX available for repayment.',
    exit: 'Repay USDD plus accrued fees, unlock collateral and verify debt is zero. USDD is the stablecoin product shown in the project docs.',
    exposure: 'Collateral + debt fees',
  },
  upshift: {
    chain: 'Ethereum', label: 'Managed vault', reference: 'Upshift docs → Vault architecture',
    inspect: 'Compare the Ethereum vault’s accepted assets, strategy and withdrawal mechanism. Confirm whether your vault settles instantly or queues.',
    enter: 'Deposit only the supported asset and record the share price and entry fee from the receipt. Skip any vault with an unclear settlement policy.',
    monitor: 'Record NAV per share and compare with the redemption preview. Track changes to the liquidity buffer or settlement terms.',
    exit: 'Preview a small ERC-4626 redemption if the vault supports it. For a queued vault, submit a request and mark the earliest settlement shown.',
  },
  'bittensor-dtao': {
    chain: 'Bittensor', label: 'Subnet stake', reference: 'Bittensor docs → Staking and pools',
    inspect: 'Use the official staking interface to compare one subnet’s netuid, TAO reserve and validator fee. Quote both stake and unstake.',
    enter: 'If useful independently of rewards, stake a small amount of TAO with a slippage limit to that validator on the recorded netuid.',
    monitor: 'Record alpha exposure and the TAO exit quote. Alpha market risk is separate from TAO price risk and validator emissions.',
    exit: 'Quote unstaking alpha back into TAO before signing. Record both asset balances. TAO and subnet alpha already exist.',
    exposure: 'TAO price + subnet slippage',
  },
  onre: {
    chain: 'Solana', label: 'Reinsurance fund', reference: 'OnRe docs → ONyc FAQ',
    inspect: 'Check the ONyc mint minimum, eligibility and redemption window in OnRe. Review the NAV before comparing it with secondary quotes.',
    enter: 'If eligible, preview a small USDC or USDG order in the official app and record the mint status and ONyc received.',
    monitor: 'Check NAV against the secondary exit price and follow underwriting or redemption notices. Treat ONyc as a reinsurance share.',
    exit: 'Compare the primary redemption window with secondary liquidity, request the preferred exit and record the net settlement.',
    exposure: 'Underwriting + redemption risk',
  },
  symbiotic: {
    chain: 'Ethereum', label: 'Collateral vault', reference: 'Symbiotic docs → Epochs and Delays',
    inspect: 'Identify the exact vault type in Symbiotic. Verify its accepted collateral, operator exposure, slashing rules and withdrawal configuration.',
    enter: 'Use a small amount of that collateral only if the vault allows retail deposits and the queue fits your deadline. Save your share or stake receipt.',
    monitor: 'For an epoch-based vault, record the epoch boundary and monitor operator or slashing events while your collateral is exposed.',
    exit: 'For an epoch-based restaking vault, queue the withdrawal and claim after the next epoch ends. For other vaults, follow the published settlement flow.',
    exposure: 'Collateral + slashing',
  },
  'lightning-network': {
    chain: 'Bitcoin', label: 'Payment route', reference: 'Lightning Network → BOLT payment specifications',
    inspect: 'Choose a Lightning wallet that exposes fees. Check whether it manages channels or requires you to open one and provide outbound capacity.',
    enter: 'Pay a real low-value Lightning invoice and retain the payment receipt. Start with an existing funded channel if you already have one.',
    monitor: 'Check actual routing fees and whether you have enough inbound capacity before attempting to receive.',
    exit: 'If you opened your own channel, quote a cooperative close first and allow for on-chain confirmation. Skip unnecessary channel churn.',
    exposure: 'Small payment + routing fees',
  },
  lagoon: {
    chain: 'Ethereum', label: 'Queued vault', reference: 'Lagoon docs → Deposit and Withdraw flows',
    inspect: 'Confirm the curator, asset and settlement cadence for the exact Lagoon vault. Check when the last deposit and redemption batches settled.',
    enter: 'If the minimum fits the trial, submit a deposit request and track it until the valuation update settles it. Claim the resulting shares.',
    monitor: 'Track the vault’s valuation updates and redemption backlog. Treat pending and settled balances as separate records.',
    exit: 'Request redemption, allow time for settlement and return to claim assets yourself. Check the rules before submitting an irreversible request.',
  },
  curvance: {
    chain: 'Monad', label: 'Isolated lending', reference: 'Curvance app → Monad markets and transparency',
    inspect: 'Open Curvance Markets on Monad and inspect the lending side of an isolated USDC pair. Check unborrowed liquidity, collateral and borrow cap.',
    enter: 'With MON reserved for fees, supply a small amount to the USDC lending side only. Record the pair, wallet and receipt.',
    monitor: 'Compare withdrawable liquidity with your balance and check oracle warnings for that pair. Recheck it after any jump in utilization.',
    exit: 'Preview a partial withdrawal from the same isolated market. Verify the USDC received before closing the remainder.',
  },
  tydro: {
    chain: 'Ink', label: 'Lending reserve', reference: 'Tydro docs → Overview',
    inspect: 'In Tydro on Ink, open a supported stablecoin reserve. Verify the asset contract, supply cap and available liquidity.',
    enter: 'Supply a small test amount and record the reserve and supply position. Keep ETH on Ink for the supply and withdrawal transactions.',
    monitor: 'Track utilization and any incentive line separately from base lending yield. If you borrowed independently, monitor health factor daily.',
    exit: 'With zero debt, withdraw from the same reserve to your Ink wallet. Confirm the received asset contract before moving chains.',
  },
  noble: {
    chain: 'Noble', label: 'IBC transfer', reference: 'Noble → Noble Dollar module and chain docs',
    inspect: 'Verify the current Noble wallet route and native denomination. For IBC, confirm the source channel, destination and matching asset denomination.',
    enter: 'Use a small transfer between supported destinations only if you need the asset there. Save the transaction and packet identifiers.',
    monitor: 'Check acknowledgement and final balance on both ends. For a timed-out packet, check the refund on the source chain before retrying.',
    exit: 'Verify support for the return route and quote the two network fees. Review USDN separately from a hypothetical network token.',
    exposure: 'Transfer float + IBC fees',
  },
  'plume-vaults': {
    chain: 'Plume Mainnet', label: 'RWA vault', reference: 'Plume → Nest vault listings',
    inspect: 'Find the specific Nest vault listed by Plume and read its underlying collateral, eligibility and expected redemption timing.',
    enter: 'Use the vault’s stated deposit asset on Plume Mainnet if the minimum fits. Save the share token identifier.',
    monitor: 'Compare NAV reporting with the latest redemption quote and monitor the underlying issuer’s liquidity or settlement notices.',
    exit: 'Use the vault’s own withdrawal request and verify the settlement asset. Allow the published redemption window before bridging back.',
  },
  'reti-pooling': {
    chain: 'Algorand', label: 'Validator pool', reference: 'Réti → Validator and pool documentation',
    inspect: 'Check the specific Réti validator’s minimum stake, commission, available capacity and entry gating. Set aside ALGO for account minimums.',
    enter: 'Only join a pool whose minimum and exit terms fit. Retain the pool ID and verify the stake is registered for your account.',
    monitor: 'Review validator performance and rewards by pool. Check whether minimum balance changes affect your available ALGO.',
    exit: 'Remove stake using the same pool and confirm the released ALGO balance. Check for any remaining rewards or balance requirements.',
    exposure: 'Stake minimum + ALGO fees',
  },
  rockawayx: {
    chain: 'Solana', label: 'Kamino RWA vault', reference: 'RockawayX → Vaults and Kamino RWA vault announcement',
    inspect: 'Open RockawayX RWA USDC in Kamino Earn. Read reserve weights and identify exposure to reinsurance and receivables.',
    enter: 'If the vault is open to your wallet, preview a small Solana USDC deposit and save the share mint and Solana signature.',
    monitor: 'Review concentration and compare the withdrawable balance with the share value. Watch for changes in the issuer mix.',
    exit: 'Use the Kamino withdrawal preview to check whether the vault can pay USDC now. Leave enough SOL to confirm the exit.',
  },
  opentrade: {
    chain: 'Avalanche', label: 'Institutional access review', reference: 'OpenTrade → Vaults and integration overview',
    inspect: 'Identify the OpenTrade partner offering the Avalanche product. Compare flexible-access products with fixed-term terms and check eligibility.',
    enter: 'Ask the partner for a fee and minimum quote in writing. Preview a deposit only in a supported product your account can access.',
    monitor: 'Track the applicable NAV or quoted rate, the dealing calendar and any notice deadline for getting capital back.',
    exit: 'Use the partner’s withdrawal interface. For a fixed-term product, plan around its stated maturity rather than assuming immediate liquidity.',
    exposure: 'Partner minimum + issuer risk',
  },
  hyperithm: {
    chain: 'Monad', label: 'Morpho vault', reference: 'Morpho → Monad network data and Hyperithm curator listing',
    inspect: 'Find the Monad Hyperithm USDC Apex vault in Morpho. Compare its collateral and liquid reserves with the other Apex deployments.',
    enter: 'Use the verified Monad USDC deposit asset, retain MON for gas and record the exact vault and share amount.',
    monitor: 'Track the biggest market exposure, withdrawable USDC and any temporary Monad ecosystem incentive separately.',
    exit: 'Preview a share redemption from that same vault on Monad and confirm available cash before attempting the withdrawal.',
  },
  'k3-capital': {
    chain: 'Unichain', label: 'WETH lending vault', reference: 'Morpho governance forum → K3 Capital ETH Maxi on Unichain',
    inspect: 'Check if K3 Capital ETH Maxi is still open and verify the WETH deposit asset. Inspect wstETH and weETH collateral and available liquidity.',
    enter: 'Only if the live vault passes the checks, preview a small WETH deposit with ETH left for Unichain gas.',
    monitor: 'Track the WETH exit preview, collateral mix and any pending cap changes on the vault’s timelock.',
    exit: 'Redeem shares for WETH before any unwrap or bridge step. Compare returned WETH with the preview.',
  },
  clearstar: {
    chain: 'Base', label: 'Morpho cbAssets vault', reference: 'Morpho → Clearstar curator listing',
    inspect: 'Check the current Clearstar cbAssets Vault listing and confirm Base and the USDC deposit asset. Review concentration by collateral type.',
    enter: 'Use a small deposit preview to confirm the share contract. Keep some ETH on Base for approval and the eventual exit.',
    monitor: 'Compare the vault’s total deposits with immediately withdrawable USDC. Check changes in the share of cbAssets-backed markets.',
    exit: 'Redeem a small part of the shares on Base. If liquidity is tight, check the latest allocation and pricing before retrying.',
  },
  'hive-protocol': {
    chain: 'BSquared', label: 'B² ecosystem review', reference: 'B² Network docs → B2 Tokenomics',
    inspect: 'Locate HIVE in the B² docs. Identify whether the particular offer uses bridged BTC, B2 or a mining-related receipt, and read its lock terms.',
    enter: 'Run a read-only preview of a documented route with your wallet network set to BSquared. Fund it only if the product and exit are clear.',
    monitor: 'Record the pool and deposit asset if you participated. Track the first unlock or settlement date and any fee payable on the way out.',
    exit: 'Verify the supported return asset and quote the redemption. Treat any published B2 rewards as an existing ecosystem incentive.',
    exposure: 'Bridge quote + quoted lock minimum',
  },
  saturn: {
    chain: 'Ethereum', label: 'Yield-dollar wrapper', reference: 'Saturn docs → USDat and sUSDat',
    inspect: 'Verify the Ethereum deployment and review the current sUSDat withdrawal mechanism, USDat liquidity, and digital credit exposure.',
    enter: 'Preview wrapping a small amount of USDat in the documented sUSDat contract. Save the share count and the resulting redemption quote.',
    monitor: 'Track both the sUSDat conversion rate and the USDat exit price. Compare idle withdrawal liquidity with any queue backlog.',
    exit: 'Use the wrapper’s current redeem flow. For a queued deployment, keep the request receipt and return to claim USDat once it settles.',
    exposure: 'USDat deposit + credit risk',
  },
  firelight: {
    chain: 'Flare', label: 'FXRP staking vault', reference: 'Firelight → Step-by-Step Guide to Staking and stXRP redemption',
    inspect: 'Verify the FXRP and stXRP product on Flare. Check the current stake cap, share price and the waiting period for unstaking.',
    enter: 'If you already hold verified FXRP, preview a small stake and check how much stXRP the vault will issue. Retain FLR for exit.',
    monitor: 'Track the stXRP-to-FXRP conversion and protocol cover events. Treat any historical points or FXRP emissions as separate programs.',
    exit: 'Submit an unstake request and return to claim FXRP when the displayed waiting period ends. Quote a secondary sale separately.',
    exposure: 'FXRP exposure + unbonding',
  },
  'galaxy-curation': {
    chain: 'Base', label: 'Curated lending review', reference: 'Galaxy → Institutional Vault Curator announcement',
    inspect: 'Find Galaxy Curation’s deployment in the official Morpho curator list. Compare the vault strategy and collateral mandate before supplying.',
    enter: 'If a Base vault is open to your wallet, use the exact listed deposit asset and record the deployment and share token.',
    monitor: 'Check market caps and concentration against the vault’s stated mandate, and separate any host incentives from the curator’s terms.',
    exit: 'Preview share redemption in the same vault and note any adapter liquidity constraint before funding a larger position.',
  },
};
