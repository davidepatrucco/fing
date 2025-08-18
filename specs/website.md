# FIA — Website Specifications

Breve piano: raccolgo gli obiettivi principali del sito, definisco le pagine e i componenti, descrivo API/data shapes, indico stack consigliato, sicurezza/secret management e criteri di accettazione.

## Obiettivo
Realizzare un sito di presentazione e strumenti per il lancio del token FIA su Base Sepolia e (poi) su Base mainnet. Il sito deve informare la community, mostrare prove on‑chain (contratto verificato, LP lock), offrire strumenti operativi (leaderboard, airdrop helper, monitor eventi) e documentazione tecnica per dev e auditor.

## Requisiti funzionali (checklist)
- [ ] Home page con hero, ticker prezzo (opzionale testnet), link a social e token contract.
- [ ] Pagina `Token` con: descrizione, tokenomics, supply, indirizzo contratto + link a BaseScan (verifica) e badge `verified`.
- [ ] Pagina `Deploy & Tools` con pulsanti/istruzioni per: deploy (dev), airdrop (CSV upload), creazione LP guida, timelock proof (link a contract timelock), e verify step.
- [ ] `Leaderboard` che mostra top fingerers / receivers generati leggendo eventi `Fingered` (su Base Sepolia) con filtro per range di blocchi e export CSV.
- [ ] `Monitor` realtime: streaming eventi `Fingered` (websocket / polling) e feed timeline.
- [ ] `NFT Badges` pagina (opzionale) con gallery e possibilità di mint (testnet) admin-only.
- [ ] `Docs` tecniche: link a repo, contratti, script (deploy/airdrop/leaderboard), guide per Metamask e faucet/bridge.
- [ ] Sezione `Security` con audit summary (se disponibile), disclaimer e link per reporting vulnerabilità.
- [ ] Footer con link a GitHub, Twitter/X, Telegram/Discord, BaseScan, e contatti.

## Pagine principali e contenuti
- `/` Home
  - Hero: nome token, short tagline, CTA primario (View token / Leaderboard)
  - Quick stats: supply, deployed address (se presente), holders (se disponibile), recent events
  - Social links + roadmap teaser
- `/token` Token details
  - Tokenomics (supply, percentuali founder/treasury/airdrop/LP)
  - Contratto: indirizzo, stato verify (badge), link a BaseScan
  # FIA — Website Specifications (dettagliate)

  Breve piano: in questo documento trovi una specifica esaustiva per il sito FIA, con tutti i flussi funzionali, API, data schema, UX, test di accettazione, deploy, CI/CD, sicurezza e struttura dei file. Puoi usare questo file come contratto di lavoro per lo sviluppo frontend/backend.

  Nota: il documento è scritto in italiano. Ogni sezione contiene le istruzioni operative e i comandi necessari per sviluppare e testare localmente.

  --------------------------------------------------------------------------------

  ## 1 — Obiettivo e pubblico

  - Obiettivo: fornire un sito pubblico per presentare il token FIA, strumenti per il lancio (airdrop, LP lock proof), e strumenti comunitari (leaderboard, leaderboard export, livestream eventi). Fornire anche una developer area con script e guide.
  - Pubblico: utenti generalisti (meme community), devs che vogliono replicare il deploy/test, e auditor.

  --------------------------------------------------------------------------------

  ## 2 — Requisiti funzionali estesi (detagliati)

  2.1 Contenuto pubblico
  - Home: hero, descrizione, CTA a token page / leaderboard, social links, status (Testnet/Mainnet), small feed eventi recenti.
  - Token page: indirizzo contratto, link BaseScan, stato verify (badge), tokenomics, grafici (supply distribution), pulsante "Import in Metamask" (copiatura indirizzo e interazione wallet).
  - Docs: guide passo-passo (Metamask, faucet, bridge, deploy locale), FAQ.

  2.2 Strumenti interattivi
  - Leaderboard: query on-chain aggregata, sorting, filtri (range blocks, date), paginazione, export CSV.
  - Airdrop tool:
    - Upload CSV/JSON con form: columns [address,amount]
    - Validazione: formato indirizzi (`ethers.isAddress`), somma totale, valori >0
    - Dry-run: calcolo gas stimato per batch, stima gas fees (in ETH), anteprima TX count
    - Execute: esegue batch di trasferimenti firmati con admin key (preferibile tramite CI/host server-side o GH Actions)
    - Audit trail: log delle tx con link BaseScan
  - Monitor eventi: realtime feed (SSE/Websocket) + storico (ultimo N eventi)
  - LP timelock viewer: mostra contratti LPTimelock/NFTTimelock, owner, unlockTime, saldo corrente.

  2.3 Admin panel (protetto)
  - Autenticazione GitHub OAuth o JWT: solo per operazioni sensibili
  - Pagine: Airdrop execute, Mint NFT (se applicabile), Trigger indexer manuale, Visualizza e revoca API keys

  --------------------------------------------------------------------------------

  ## 3 — UX flows dettagliati

  3.1 Flow: Airdrop (admin)
  1. Admin apre /tools/airdrop
  2. Carica CSV -> validazione lato client (format, duplicate addresses)
  3. La UI mostra preview: totale token, totale batch, gas estimate per batch
  4. Admin conferma -> UI invia request al backend `POST /api/airdrop/execute` con file e metadati
  5. Backend verifica auth, calcola batches, firma e invia transazioni oppure delega a GitHub Actions che esegue lo script con la PRIVATE_KEY in secret
  6. Backend ritorna lista txHashes e li mostra nella UI con link a BaseScan

  3.2 Flow: Leaderboard
  1. L’utente apre /leaderboard
  2. UI chiede al backend `GET /api/leaderboard?fromBlock=&toBlock=&limit=50`
  3. Backend risponde con array aggregato; la UI mostra ranking, percentuali e pulsante CSV

  3.3 Flow: Verify automatico (CI)
  1. Dopo deploy in CI, lo script salva `deployments/fia.json`
  2. CI legge file e chiama `npx hardhat verify --network baseSepolia <addr> <args>` usando secret `BASESCAN_API_KEY`
  3. CI registra output e pubblica link al contract verified

  --------------------------------------------------------------------------------

  ## 4 — API dettagliata (contract-first)

  Tutte le route sotto `/api` (REST) — autenticazione con header `Authorization: Bearer <token>` per endpoint admin.

  4.1 GET /api/contract
  - Descrizione: restituisce l’oggetto del contratto con address, args, verify status
  - Response 200:
    {
      "address": "0x...",
      "args": ["0x...","0x..."],
      "verified": true,
      "network": "baseSepolia"
    }

  4.2 GET /api/events?limit=100&fromBlock=0&toBlock=latest
  - Restituisce eventi `Fingered` più recenti con pagination
  - Response: array di event objects (vedi data shapes)

  4.3 GET /api/leaderboard?fromBlock=&toBlock=&limit=50
  - Restituisce gli aggregati: per ogni address { given, received }

  4.4 POST /api/airdrop/preview
  - BODY: multipart/form-data file=recipients.csv OR JSON { rows: [{address,amount}] }
  - Response: { totalAmountToken, batches: N, estimatedGasPerBatch, estimatedEthFeePerBatch }

  4.5 POST /api/airdrop/execute
  - AUTH required (admin)
  - BODY: same as preview plus options { dryRun: false, gasMultiplier }
  - Behaviour: enqueue job (background worker) che processa i batch e firma/sends via provider + PRIVATE_KEY del host/CI
  - Response: jobId, preview txHashes(empty until processed)

  4.6 POST /api/indexer/trigger
  - AUTH: admin
  - Forza re-index del range passato

  --------------------------------------------------------------------------------

  ## 5 — Data shapes (strict schema)

  FingeredEvent (JSON Schema):
  {
    "type": "object",
    "properties": {
      "blockNumber": {"type":"integer"},
      "txHash": {"type":"string"},
      "from": {"type":"string"},
      "to": {"type":"string"},
      "amount": {"type":"string"},
      "timestamp": {"type":"integer"}
    },
    "required": ["blockNumber","txHash","from","to","amount","timestamp"]
  }

  LeaderboardItem:
  {
    "address": "0x...",
    "given": "bigint string",
    "received": "bigint string"
  }

  --------------------------------------------------------------------------------

  ## 6 — Architettura indexer e scalabilità

  - Indexer process (recommended):
    - Service Node.js (or serverless with persistent storage) che si connette a Base Sepolia provider via websockets
    - Ascolta i blocchi e filtra eventi `Fingered` del contract address
    - Scrive eventi in DB (SQLite for small dev, Postgres for prod)
    - Aggregazioni su demand: cache recent leaderboard in Redis

  - Scalabilità:
    - Per grandi volumi usare Postgres + materialized views aggiornate periodicamente
    - Caching: Redis per leaderboard e recent events
    - Polling fallback: se websocket cade, usa `provider.getLogs` su intervalli di blocchi

  --------------------------------------------------------------------------------

  ## 7 — Sicurezza, segreti e permessi (operativo)

  7.1 Secrets
  - NON committare mai `PRIVATE_KEY` in repo.
  - Secrets in produzione: GitHub Secrets (CI), Vercel environment variables (host), or vault.

  7.2 Permessi e ruoli
  - Wallet admin: tenere in cold storage fenomeni reali; per testnet usa chiavi con pochi fondi.
  - Admin endpoints: protezione con OAuth (GitHub) o JWT; rate limit e logging.

  7.3 Validazioni
  - Sanitize CSV: trim, lowercase, remove duplicates
  - Validate addresses: `ethers.isAddress`
  - Max per-batch limit (es. 100) per evitare blocchi/forks

  --------------------------------------------------------------------------------

  ## 8 — CI/CD, deploy e verify (dettagli operativi)

  8.1 Local dev
  - Clone repo
  - Installa dependencies:
    ```bash
    cd web
    npm install
    npm run dev
    ```

  8.2 Build e deploy su Vercel (consigliato)
  - Environment variables (Vercel dashboard): `RPC_BASE_SEPOLIA`, `BASESCAN_API_KEY`, `PRIVATE_KEY` (solo se necessario lato server), `NEXT_PUBLIC_API_URL`
  - GitHub Actions (opzionale) per step che vogliamo automatizzare:
    - build
    - test
    - deploy (trigger Vercel via GitHub integration or `vercel` CLI)
    - post-deploy verify: run `npx hardhat verify --network baseSepolia` using `BASESCAN_API_KEY` secret

  8.3 CI workflow (snippet)
  - Steps:
    - checkout
    - setup node 20
    - npm ci
    - run linter/tests
    - build
    - if secrets present: run `npx hardhat run scripts/deploy.ts --network baseSepolia`
    - verify using `npx hardhat verify --network baseSepolia $ADDR $ARGS`

  --------------------------------------------------------------------------------

  ## 9 — Testing strategy

  - Unit tests: components React (Jest + React Testing Library), backend endpoints with supertest
  - Integration tests: run Hardhat local network + run scripts end-to-end (deploy local, airdrop dry-run)
  - E2E: Playwright or Cypress to cover UI flows (airdrop preview, leaderboard filters)
  - Load testing: run k6 on `/api/leaderboard` and `/api/events` endpoints

  --------------------------------------------------------------------------------

  ## 10 — Monitoring, logging e metriche

  - Error logging: Sentry
  - Performance: Lighthouse CI for PRs
  - On-chain monitoring: watch for failed TXs, spikes in gas utilization
  - Metrics to record: deploy success rate, airdrop tx success, average gas per batch, leaderboard query latency

  --------------------------------------------------------------------------------

  ## 11 — Folder structure proposta

  web/
  - pages/ (Next.js pages)
  - components/
  - styles/
  - public/
  - scripts/ (client utilities)

  api/
  - indexer/ (worker)
  - routes/
  - jobs/ (airdrop job processor)

  infrastructure/
  - docker-compose.yml (dev: postgres + redis)
  - vercel.json / netlify.toml

  scripts/
  - deploy.ts (hardhat deploy)
  - verify.ts
  - watch-events.ts

  tests/
  - integration/
  - e2e/

  --------------------------------------------------------------------------------

  ## 12 — Acceptance criteria (dettagliata)

  - Funzionale:
    - Upload CSV con 1k righe valida in UI e preview corretta
    - Leaderboard query < 500ms per 50k eventi (con cache)
    - Verify automatico in CI eseguito con successo se `BASESCAN_API_KEY` presente

  - Sicurezza:
    - Nessuna private key nel repo
    - Endpoints admin richiedono auth e sono rate-limited

  - Qualità:
    - 90+ Lighthouse score su Home e Token page
    - Test coverage minimo: 80% su backend critico (indexer, airdrop)

  --------------------------------------------------------------------------------

  ## 13 — Stime e costi indicativi

  - Small MVP (frontend + indexer minimal + airdrop dry-run): 1–2 settimane di lavoro (1 dev)
  - Production-ready (scale + CI verify + monitoring): 3–4 settimane
  - Hosting: Vercel free plan per frontend, DB e Redis su managed provider (Heroku/Render) — costo variabile

  --------------------------------------------------------------------------------

  ## 14 — Esempi e snippet utili (operativi)

  - Esempio curl per leaderboard:
    ```bash
    curl "${NEXT_PUBLIC_API_URL}/api/leaderboard?limit=10" | jq
    ```

  - Comando per verify manuale (dopo deploy):
    ```bash
    npx hardhat verify --network baseSepolia 0xCONTRACT_ADDR "0xTREASURY" "0xFOUNDER"
    ```

  --------------------------------------------------------------------------------

  Se vuoi, procedo subito a generare lo scaffold `web/` (Next.js + Tailwind) e lo starter dell’`api/indexer` con Docker compose per development; dimmi se preferisci Vercel (raccomandato) o Netlify come hosting e procedo con la creazione dei file e dei comandi di deploy.
