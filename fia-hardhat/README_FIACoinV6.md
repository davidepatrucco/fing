# FIACoin V6 — Feature Summary

Questo file riepiloga in modo conciso tutte le funzionalità implementate nel contratto `FIACoinV6.sol` presente in `contracts/`.

## Panoramica
FIACoin v6 è un token ERC20 evoluto che riprende la maggior parte delle funzionalità di v5, aggiungendo il pattern di esecuzione su un `executor` esterno (es. Gnosis Safe / timelock) e helper dedicati ai test.

## Funzionalità principali

- Token base
  - ERC20 standard ("FiaCoin v6", simbolo: "FIA").
  - Mint iniziale dell'intera supply al `treasury` (costruttore).

- Configurazione fee & distribuzione
  - Parametri: `totalFeeBP`, `feeToTreasuryBP`, `feeToFounderBP`, `feeToBurnBP`.
  - Funzioni amministrative: `setTotalFeeBP`, `setFeeDistribution`, `setFeeExempt`.
  - Applicazione fee nel flusso di trasferimento (`_update`): calcolo fee, invio a treasury/founder, burn.
  - Tracciamento analytics: `tokenStats.totalFeeCollected`, `tokenStats.totalBurned`, `userStats[].totalFeesPaid`.

- Governance on-chain (token-weighted)
  - Tipi di proposta (`ProposalType`) e `Proposal` struct.
  - Funzioni: `propose`, `vote`, `execute`.
  - Parametri di governance: `PROPOSAL_THRESHOLD`, `VOTING_PERIOD`, `QUORUM_PERCENTAGE`, `EXECUTION_DELAY`.
  - Esecuzione di azioni tramite `_executeProposal` (es. `FEE_CHANGE`, `TREASURY_SPEND`).

- Esecutore esterno (external Safe / timelock)
  - `address public executor` e `setExecutor`.
  - `execute` può essere invocata solo da `executor` o `owner()` (fallback).
  - Pattern pensato per delegare esecuzione a una Safe esterna o timelock.

- Helper di test (ONLY OWNER — usare con cautela)
  - `ownerMintForTests(address to, uint256 amount)` — mint di test.
  - `ownerCreateProposalForTests(...)` — crea proposte bypassando `PROPOSAL_THRESHOLD`.
  - `_initializing` guard per bypassare hook durante inizializzazione / helper.
  - Nota: rimuovere o isolare questi helper prima del deploy in produzione.

- Staking & reward
  - `stake`, `unstake`, `claimRewards`.
  - Struttura `StakeInfo`, mapping `userStakes`, `totalStaked`, `rewardPool`.
  - APY per periodi di lock (`stakingAPY`) e calcolo ricompense `_calculateRewards`.

- Limiti di transazione e Anti‑MEV
  - `TransactionLimits` con `maxTxAmount`, `maxWalletAmount`, `txCooldown`, `limitsActive`.
  - `lastTxBlock`, `usedNonces`, `lastTxTime` per enforcement.
  - Modificatore `antiMEV(uint256 nonce)` (no same-block, nonce unico, cooldown).
  - `protectedTransfer` che applica `antiMEV`.
  - `_enforceTransactionLimits` per controlli di limite transazioni.

- Pause / sicurezza
  - Funzionalità `Pausable`: `emergencyPause`, `emergencyUnpause`.
  - `ReentrancyGuard` usato dove necessario.

- Operazioni batch
  - `batchTransfer`, `batchSetFeeExempt`, `batchStake`.

- Trasferimenti avanzati e utilità
  - `transferWithData`, `scheduledTransfer`, `recurringTransfer` (placeholder/ID generatori).

- Integrazioni DeFi & cross-chain (placeholder)
  - Stub: `depositToYieldFarm`, `borrowAgainstStake`, `flashLoan`, `bridgeTokens`.

- Analytics / Telemetria
  - `TokenAnalytics` e `UserAnalytics` con viste `getTokenStats`, `getUserStats`.
  - `_updateAnalytics` mantiene contatori e tracking nuovi holder.

- Eventi
  - `Fingered`, `FeeExemptionSet`, `FeeConfigurationChanged`, `FeeDistributionChanged`, `EmergencyAction`.
  - Governance events, staking events, batch events.

## Note di sicurezza e consigli per il deploy

- Gli helper `ownerMintForTests` e `ownerCreateProposalForTests` sono utili per CI/test locali ma devono essere rimossi o isolati tramite build flags prima di un deploy in mainnet.
- Verificare la correttezza delle chiavi `treasury` e `executor` in fase di deploy: la supply è mintata al `treasury` e l'`executor` governa l'esecuzione delle proposte.
- Testare integrato con una Gnosis Safe o un timelock reale per confermare i permessi e le interazioni off-chain.

## Come eseguire i test (esempio locale)
Esempio per eseguire la suite di test Hardhat dalla cartella `fia-hardhat`:

```bash
# dalla root del progetto
cd fia-hardhat
npm install
npx hardhat test
```

(Se usi Ethers v6 e Hardhat, la suite della repo è già aggiornata per Ethers v6 nelle test files.)

## Prossimi passi raccomandati
- Rimuovere o isolare gli helper di test in una versione release/production.
- Aggiungere test E2E che esercitano l'interazione con una Safe esterna (o MockSafe) e i flussi di governance reali.
- Documentare convenzioni di upgrade e migration (se si prevede proxy/upgradeability).

---
File generato automaticamente: `fia-hardhat/README_FIACoinV6.md` — aggiornalo se vuoi che includa esempi di codice o riferimenti a test specifici.
