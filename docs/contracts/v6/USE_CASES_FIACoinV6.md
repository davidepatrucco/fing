# FIACoin V6 — Use Cases

Questo documento elenca gli use case coperti dal contratto `FIACoinV6.sol`, suddivisi per ruolo.

## Utente (holder)

- Trasferimenti
  - Inviare FIA (transfer standard, con fee e limiti applicati).
  - Inviare FIA con metadati (`transferWithData`).
    - I metadati non sono salvati on‑chain; viene emesso l’evento `TransferWithDataLite(from, to, amount, memoHash)` con `memoHash = keccak256(data)`.
  - Inviare FIA in modalità protetta anti‑MEV con nonce (`protectedTransfer`).
  - Effettuare invii multipli in batch (più destinatari).
- Staking
  - Aprire uno stake con lock a 30/90/180/365 giorni e opzionale auto‑compound.
  - Richiedere (claim) le ricompense maturate su uno stake.
  - Disfare uno stake; gestione penalty in caso di uscita anticipata.
  - Consultare ricompense pendenti e leaderboard (versione semplificata).
- Governance
  - Votare una proposta attiva entro il periodo di voto.
  - Creare una proposta se il saldo ≥ `PROPOSAL_THRESHOLD`.
  - Verificare il proprio voting power (bilancio corrente).
- Burn
  - Bruciare i propri token (`burn`).
- Analytics
  - Consultare statistiche globali del token (`getTokenStats`).
  - Consultare statistiche personali (`getUserStats`).
- Utility avanzate (placeholder)
  - Generare ID per trasferimenti pianificati (`scheduledTransfer`) o ricorrenti (`recurringTransfer`).
  - Avviare interfacce DeFi: `depositToYieldFarm`, `borrowAgainstStake`, `flashLoan` (richiedono integrazioni esterne).
  - Avviare un bridge cross‑chain (`bridgeTokens`, placeholder; integrazione esterna necessaria).

## Admin (owner)

- Configurazione fee
  - Impostare la fee totale (`setTotalFeeBP`, con limiti e delay).
  - Impostare la distribuzione tra treasury / founder / burn (`setFeeDistribution`).
  - Impostare esenzioni dalle fee per indirizzi singoli o in batch (`setFeeExempt`, `batchSetFeeExempt`).
- Limiti transazionali e sicurezza
  - Limiti: `maxTxAmount`, `maxWalletAmount`, `txCooldown`, `limitsActive` sono preconfigurati in V6; non esiste un setter pubblico.
  - Attivare la pausa d’emergenza e riprendere le operazioni (`emergencyPause`, `emergencyUnpause`).
- Treasury & staking
  - Aggiungere fondi al reward pool (`addToRewardPool`).
- Governance & executor
  - Impostare l’indirizzo `executor` (Safe/timelock esterno) con `setExecutor`.
  - Eseguire proposte come fallback owner se necessario (oltre all’executor) con `execute`.
    - Vincoli temporali: l’esecuzione è possibile solo dopo la fine del periodo di voto e dopo `EXECUTION_DELAY`.
    - Reason tipiche in revert:
      - `Not authorized to execute` (chiamante diverso da `executor` o `owner`).
      - `Voting still active` (periodo di voto non ancora terminato).
      - `Execution delay not met` (non è trascorso `EXECUTION_DELAY` dalla fine del voto).
      - `Quorum not met` (partecipazione insufficiente).
      - `Proposal rejected` (maggioranza contraria).
      - `Already executed` (proposta già eseguita).
- Helper di test (solo ambienti di sviluppo)
  - Mint di test verso un indirizzo (`ownerMintForTests`).
  - Creazione proposta bypassando la soglia (`ownerCreateProposalForTests`).

## Executor esterno (Safe/timelock)

- Eseguire una proposta approvata chiamando `execute(proposalId)` dopo la fine del periodo di voto e il `EXECUTION_DELAY`, verificando quorum e maggioranza.

## Troubleshooting — Governance timing e flusso di esecuzione

- Parametri di tempo (default V6):
  - `VOTING_PERIOD`: 7 giorni.
  - `EXECUTION_DELAY`: 48 ore dopo la fine del voto.
  - Esempio timeline: creazione T0 → fine voto T0+7g → earliest execute T0+7g+48h.

- Errori comuni (reason in revert):
  - `Not authorized to execute`: chiamante diverso da `executor` o `owner`.
  - `Voting still active`: tentativo di esecuzione prima di T0+7g.
  - `Execution delay not met`: tentativo di esecuzione tra T0+7g e T0+7g+48h.
  - `Quorum not met`: somma (for+against) sotto la soglia di quorum.
  - `Proposal rejected`: `againstVotes >= forVotes`.
  - `Already executed`: proposta già eseguita.

- Ricetta rapida (sequenza consigliata):
  1) Creare proposta (owner o account con saldo ≥ soglia).
  2) Votare entro 7 giorni (raggiungere quorum e maggioranza).
  3) Attendere la fine del voto, poi attendere 48 ore di delay.
  4) Chiamare `execute(proposalId)` da `executor` (Safe/timelock) o `owner` fallback.

- Suggerimenti di test (reti locali):
  - Usare salti temporali per simulare fine voto e delay (es. +7g, poi +48h).
  - Evitare di votare su proposte il cui periodo è già scaduto (revert `Voting period ended`).
