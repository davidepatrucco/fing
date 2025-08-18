Breve piano

- Aggiungo istruzioni compatte per usare `mint-and-lock.ts` e varianti (solo mint, solo deploy timelock, solo transfer).
- Includo le variabili d'ambiente principali e esempi di comandi `npx hardhat run`.

Checklist
- [x] Esempi di esecuzione completa (mint + deploy + transfer)
- [x] Esempi di esecuzione separata (mint-only, deploy-only, transfer-only)
- [x] Spiegazione variabili d'ambiente e fallback
- [x] Troubleshooting rapido

README: script `mint-and-lock.ts`

Scopo
Questo script è un helper Hardhat che tenta di: 1) mintare una posizione Uniswap v3 (NFT) tramite il `NonfungiblePositionManager`, 2) deployare `NFTTimelock` per un `tokenId`, 3) trasferire l'NFT al timelock.

Prerequisiti
- Configurare `.env` o esportare le variabili d'ambiente elencate qui sotto.
- Avere ETH test sul wallet configurato e il token `FIA` deployato e disponibile.
- Hardhat configurato per `baseSepolia` (vedi `hardhat.config.ts`).

Variabili d'ambiente (principali)
- `PRIVATE_KEY` — chiave del wallet deployer (testnet).
- `RPC_BASE_SEPOLIA` — RPC URL (es. https://sepolia.base.org).
- `FIA_ADDR` — indirizzo del token FIA (obbligatorio).
- `POS_MANAGER` — NonfungiblePositionManager (default: 0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2).
- `WETH_ADDR` — WETH su Base Sepolia (default: 0x4200000000000000000000000000000000000006).
- `AMOUNT_FIA` — quantità FIA (es. "500000000"; lo script applica i decimals del token).
- `AMOUNT_WETH` — quantità WETH (es. "1").
- `FEE` — fee tier (es. 3000).
- `TICK_LOWER` / `TICK_UPPER` — ticks per la posizione (default full-range: -887220 / 887220).
- `UNLOCK_DAYS` — giorni prima che il timelock possa essere ritirato (default 30).
- `WRAP_ETH` — se impostato a `1`, lo script esegue `weth.deposit()` con `AMOUNT_WETH`.

Esecuzione: workflow completo (mint + deploy timelock + transfer)
Assicurati di avere le env impostate. Esempio:

```bash
cd fia-hardhat
export FIA_ADDR=0xYourFIA
export PRIVATE_KEY=0xyour_test_key
export AMOUNT_WETH=0.01
# opzionali:
# export AMOUNT_FIA=500000000
# export AMOUNT_WETH=1
npx hardhat run scripts/mint-and-lock.ts --network baseSepolia
```

Varianti utili

1) Solo mint (ottieni tokenId, non deploy timelock)
- Modifica lo script per commentare la sezione deploy/transfer oppure copia lo snippet mint in `scripts/mint-only.ts`.
- Esempio comando:

```bash
npx hardhat run scripts/mint-only.ts --network baseSepolia
```

2) Solo deploy `NFTTimelock` (hai già tokenId)
- Usa questo snippet rapido (crea `scripts/deploy-nfttimelock.ts` con i parametri):

```ts
// deploy-nfttimelock.ts (sintesi)
const NFTTimelock = await ethers.getContractFactory('NFTTimelock');
const inst = await NFTTimelock.deploy(POS_MANAGER, TOKEN_ID, UNLOCK_TIME);
await inst.waitForDeployment?.();
console.log('deployed', inst.address);
```

Esegui:
```bash
npx hardhat run scripts/deploy-nfttimelock.ts --network baseSepolia
```

3) Solo transfer (se il tokenId è tuo)
- Usa `safeTransferFrom` via script o direttamente dalla sezione "Write" su BaseScan per `NonfungiblePositionManager`.

Script CLI (esempio):
```bash
npx hardhat run scripts/transfer-nft-to-timelock.ts --network baseSepolia
```

Troubleshooting rapido
- callStatic mint fallisce: la simulazione può fallire se i parametri non sono corretti (ticks/fee/ammontari). Prova a usare valori small-range o rivedere gli importi.
- tokenId non trovato: cerca l'evento `Transfer` nel receipt o chiama `ownerOf` sul `NonfungiblePositionManager`.
- gas troppo basso: aumenta `gasLimit` nelle chiamate `mint`.
- WETH deposit fallisce: assicurati che il contratto `WETH` abbia la funzione `deposit()` su Base Sepolia (indirizzo di default viene dalla doc Uniswap).

Cosa posso fare dopo
- Generare `scripts/mint-only.ts`, `scripts/deploy-nfttimelock.ts` e `scripts/transfer-nft-to-timelock.ts` separati se li vuoi già pronti.
- Aggiungere esempi pre‑popolati `.env.example` per una demo rapida.

---
File creato: `fia-hardhat/scripts/README.md`
