# PR: Enable FIACoin V5 features in the existing `web` app

Status: Draft
Target folder: `web/`

Summary
--------
This PR extends the existing frontend under `web/` to support FIACoin V5 features (governance, staking, protected transfers / anti‑MEV, multisig/treasury flows and dev MockDEX tooling). It re-uses the current app structure and wallet/connect flow; adds typed contract wrappers (TypeChain), Web3 hooks, pages/components, deterministic dev utilities and Playwright e2e tests. A CI workflow will run Hardhat and frontend e2e against a spawned local node.

Why
---
- FIACoin V5 introduces governance, staking, anti‑MEV mechanics and multisig interactions that the current frontend doesn't surface.
- Developer tooling (MockDEX pages) helps reproduce E2E flows locally and makes the repo useful for reviewers and QA.

Scope (high level)
-------------------
- Integrate ethers v6 TypeChain artifacts into frontend
- Extend wallet hook to provide provider/signer and typed contracts
- Add UI pages/components for governance, staking, protectedTransfer, multisig/treasury
- Add dev-only MockDEX pages behind a feature flag
- Add deterministic test helpers and Playwright e2e tests
- Add CI job (.github/workflows/frontend-ci.yml) to run Hardhat tests + frontend e2e

Checklist (this PR will include)
--------------------------------
- [ ] Web3 provider extensions (hooks + context)
- [ ] TypeChain integration and contract wrappers for: FIACoinV5, MockDEX, LPTimelock, SimpleMultiSig
- [ ] Governance pages: create proposal, proposals list, vote/execute UI
- [ ] Staking pages: stake, unstake, claim, reward preview
- [ ] ProtectedTransfer modal: nonce helpers and clear UX
- [ ] Multisig/Treasury UI: submit/confirm/execute txs, transaction feed
- [ ] Dev-only MockDEX pages (feature-flagged)
- [ ] Playwright e2e tests for critical flows
- [ ] CI workflow to run Hardhat tests and frontend e2e
- [ ] `web/README.md` with local dev steps and env var documentation

Concrete file plan (add / modify)
---------------------------------
Note: file names are suggestions; adapt to existing app structure.

1) Web3 Core (hooks / context)
- Edit: `web/src/hooks/useWallet.ts` (or existing wallet hook)
  - Add exports: `connectWallet()`, `disconnect()`, `getProvider()`, `getSigner()`, `address`, `chainId`.
  - Keep existing UI unchanged; provide backward-compatible API.

- Add: `web/src/hooks/useContracts.ts`
  - Exports typed factory functions:
    - `getFiaContract(providerOrSigner)`
    - `getMockDexContract(providerOrSigner)`
    - `getLPTimelockContract(providerOrSigner)`
    - `getMultisigContract(providerOrSigner)`
  - Uses TypeChain generated classes.

2) TypeChain & contract wrappers
- Add script in `web/package.json`:
  - `typechain: "typechain --target ethers-v6 --out-dir src/types ../fia-hardhat/artifacts/**/*.json"`
- Add `web/src/contracts/fiacoin.ts` (thin wrapper) and equivalent for MockDEX, LPTimelock, SimpleMultiSig that use types in `src/types`.

3) Governance UI (reuse existing "Governance" area)
- Add files:
  - `web/src/pages/Governance/ProposalsList.tsx`
  - `web/src/pages/Governance/CreateProposal.tsx`
  - `web/src/components/Governance/ProposalCard.tsx`
- Behavior:
  - List proposals using `proposalCount` + read `proposals(i)` mapping; show voting power by calling `getVotingPower(address)`.
  - Create proposal encodes type-specific `proposalData` (e.g., fee change -> abi.encode(uint256), treasury spend -> abi.encode(address,uint256)).
  - Execution button is enabled when `block.timestamp > endTime + EXECUTION_DELAY` and vote outcome passes.

4) Staking UI
- Add files:
  - `web/src/pages/Staking/StakeForm.tsx`
  - `web/src/pages/Staking/UnstakeList.tsx`
  - `web/src/components/Staking/RewardPreview.tsx`
- Behavior:
  - Call `stake(amount, lockPeriod, autoCompound)` and `unstake(index)` using signer.
  - Fetch `getStakingRewards(account)` to show reward preview and `getStakingLeaderboard()` for display.

5) ProtectedTransfer (anti‑MEV)
- Add `web/src/pages/Transfer/ProtectedTransfer.tsx` (modal)
  - Fields: recipient, amount, nonce (auto-suggested), explanation about same-block and cooldown.
  - Auto-suggest logic: call `fia.lastTxBlock(address)` and `fia.lastTxTime(address)` to recommend nonce strategy. Note: `usedNonces` is internal; optionally propose new read helper in contract (see "Contract helpers").
  - Explicit confirm checkbox and clear warning copy.

6) Multisig & Treasury UI
- Add pages/components:
  - `web/src/pages/Multisig/SubmitTx.tsx`
  - `web/src/pages/Multisig/PendingTxs.tsx`
- Behavior: submit multisig tx (target, value, data), show confirmation state by listening to events, and call `executeTransaction(txId)` when threshold met.

7) MockDEX Dev Pages (feature-flagged)
- Add under `web/src/pages/Dev/MockDEX/`:
  - `AddLiquidity.tsx`, `Swap.tsx`, `RemoveLiquidity.tsx`, `ReservesCard.tsx`
- Gate with `REACT_APP_ENABLE_DEV_TOOLS=true`.

8) Playwright e2e tests (recommended)
- Add `web/e2e/playwright.config.ts` and tests under `web/e2e/tests/`:
  - `governance.spec.ts` — create -> vote -> advance time -> execute
  - `staking.spec.ts` — stake -> advance time -> claim
  - `protected.spec.ts` — protectedTransfer flow using deterministic helper from hardhat tests
  - `mockdex.spec.ts` — add liquidity -> swap -> remove liquidity (dev flag required)
- Tests assume local Hardhat node running and fixture-seeded state.

9) CI changes
- Add `.github/workflows/frontend-ci.yml`:
  - Job matrix: (node latest)
  - Steps: checkout, setup node, npm ci, generate typechain (or copy artifacts), run `npx hardhat node` (background) with seed script, run `npx hardhat test`, start frontend, run Playwright tests, upload Playwright report/artifacts.

10) Docs
- Add `web/README.md` with dev commands and `web/.env.example` describing `REACT_APP_RPC_URL` and `REACT_APP_ENABLE_DEV_TOOLS`.

Code snippets / examples
-----------------------
1) Minimal `useContracts.ts` example (pseudo-code):

```ts
import { FiaCoinV5__factory } from '../types';
import { ethers } from 'ethers';

export function getFiaContract(providerOrSigner: ethers.Provider | ethers.Signer, address: string) {
  return FiaCoinV5__factory.connect(address, providerOrSigner as any);
}
```

2) TypeChain generation command to add to `web/package.json` scripts:

```json
"scripts": {
  "typechain": "typechain --target ethers-v6 --out-dir src/types ../fia-hardhat/artifacts/**/*.json",
  "dev": "vite",
  "build": "vite build",
  "e2e": "playwright test"
}
```

Local dev instructions (to include in web/README.md)
---------------------------------------------------
1) Start Hardhat node and seed fixtures

```bash
cd fia-hardhat
npx hardhat node &
# optional: node scripts/seed.js --this will use deploy scripts to create fixture state
```

2) In a new terminal, start web app

```bash
cd web
npm install
REACT_APP_RPC_URL=http://localhost:8545 REACT_APP_ENABLE_DEV_TOOLS=true npm run dev
```

3) Run Playwright e2e

```bash
npm run typechain
npm run e2e
```

Contract helpers (optional, recommended)
----------------------------------------
If you want better UX for nonce suggestions and proposal ETAs, add tiny view helpers to `FIACoinV5.sol`:

```solidity
function isNonceUsed(address who, uint256 nonce) external view returns (bool) {
  return usedNonces[keccak256(abi.encode(who, nonce))];
}

function getProposalEta(uint256 id) external view returns (uint256) {
  Proposal storage p = proposals[id];
  return p.endTime + EXECUTION_DELAY;
}
```

These are optional but improve deterministic frontend behavior.

Security & UX considerations (must include in PR)
-------------------------------------------------
- Dangerous actions (treasury spend, emergency pause) must have an extra confirmation modal and show the encoded tx payload to multisig signers.
- Feature flags for dev-only pages.
- Provide human-readable revert messages when possible (capture `error.data` in UI and show reason).
- Event indexing: use `provider.getLogs` for a small in-app event ledger; recommend subgraph for production.

Phased rollout / Implementation estimate
----------------------------------------
- Phase 1 (MVP - 3–5 days): TypeChain + Web3 hook extension + read-only dashboard (balances, proposals, stakes). Add `web/README.md` and typechain script.
- Phase 2 (3–5 days): Governance write flows + protectedTransfer modal + unit tests.
- Phase 3 (3–5 days): Multisig/treasury UI + MockDEX dev pages + Playwright e2e.
- Phase 4 (1–2 days): CI, docs polishing and QA.

PR template to include
----------------------
- Title: `feat(frontend): enable FIACoin v5 flows`
- Body: summary, files added/modified, how to run locally, security notes, optional contract helper suggestions, checklist of tasks and what remains.

Next steps I can take for you
----------------------------
- Open a draft PR that implements Phase 1 (web hooks + TypeChain + read-only dashboard + README) and run local smoke tests.
- Or implement a narrower change first (for example, add only the `ProtectedTransfer` modal + helper) if you prefer.

Tell me “Start Phase 1” to open the draft PR and I will implement and run smoke tests locally.
