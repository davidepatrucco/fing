
# FIA — Finger In Ass Coin
**Guida completa e DETTAGLIATA per simulare il lancio su Base Sepolia (testnet)**  
*“The most uncomfortable — and hilarious — transfer in crypto history”*

> Questa guida è scritta **a prova di profano**. Seguila dall’alto verso il basso.  
> Useremo **Base Sepolia** (testnet EVM) per evitare di spendere denaro reale.

---

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Setup del wallet (Metamask) e rete Base Sepolia](#setup-del-wallet-metamask-e-rete-base-sepolia)
3. [Ottenere ETH di test](#ottenere-eth-di-test)
4. [Scaricare e preparare il progetto Hardhat di FIA](#scaricare-e-preparare-il-progetto-hardhat-di-fia)
5. [Configurare le variabili d’ambiente (.env)](#configurare-le-variabili-dambiente-env)
6. [Compilare e fare il deploy del contratto FIA su Base Sepolia](#compilare-e-fare-il-deploy-del-contratto-fia-su-base-sepolia)
7. [Verificare il contratto su BaseScan (opzionale ma consigliato)](#verificare-il-contratto-su-basescan-opzionale-ma-consigliato)
8. [Eseguire un airdrop di test](#eseguire-un-airdrop-di-test)
9. [Creare/mostrare la Liquidity Pool e simularne il lock](#crearemostrare-la-liquidity-pool-e-simularne-il-lock)
10. [Leggere gli eventi e generare la leaderboard](#leggere-gli-eventi-e-generare-la-leaderboard)
11. [NFT “Butt Badges” (opzionale)](#nft-butt-badges-opzionale)
12. [Next Steps (roadmap pratica)](#next-steps-roadmap-pratica)
13. [Contratti e script inclusi](#contratti-e-script-inclusi)
14. [Troubleshooting](#troubleshooting)
15. [Disclaimer](#disclaimer)

---

## Prerequisiti
- **Computer con**: Windows, macOS o Linux.
- **Browser** (Chrome / Brave / Firefox).
- **Node.js 20+** (vai su https://nodejs.org e installa la versione LTS).
- **Metamask** (estensione del browser) — creeremo un **account di test**.
- Un minimo di dimestichezza con il **terminal** (prompt dei comandi).

Verifica Node dopo l’installazione:
```bash
node -v
# deve stampare v20.x.x (o superiore)
```

---

## Setup del wallet (Metamask) e rete Base Sepolia
1. **Installa Metamask**: visita https://metamask.io, aggiungi l’estensione al browser.
2. **Crea un nuovo account di TEST** (non usare il tuo account “vero”):
   - Clicca *Create a new wallet* → segui la procedura → **salva la seed phrase** in modo sicuro.
3. **Aggiungi la rete Base Sepolia** a Metamask:
   - Metamask → **Impostazioni** → **Reti** → **Aggiungi rete**.
   - Inserisci i seguenti dati:
     - **Network Name**: `Base Sepolia`
     - **RPC URL**: `https://sepolia.base.org`
     - **Chain ID**: `84532`
     - **Currency Symbol**: `ETH`
     - **Block Explorer**: `https://sepolia.basescan.org`
   - Salva e seleziona la rete **Base Sepolia** dal menu delle reti in alto.

> Se non vedi ETH dopo il faucet/bridge, assicurati di aver selezionato la rete *Base Sepolia* in Metamask (non “Ethereum Mainnet” o “Sepolia” semplice).

---

## Ottenere ETH di test
Ti servono **ETH di test** per pagare il gas su Base Sepolia. Hai due strade:

### A) Faucet che dà **direttamente** ETH su Base Sepolia
- Cerca “**Base Sepolia faucet**”. Esempio: alcuni faucet (come Triangle faucet per Base Sepolia) permettono di ricevere ETH direttamente su Base Sepolia.

**Passi generici (click-by-click)**:
1. Vai sul faucet → fai **Login** (spesso chiede GitHub/Google).
2. Inserisci il tuo **indirizzo Metamask** (quello che inizia con `0x...`).
3. Seleziona **Rete: Base Sepolia**.
4. Clicca **Request/Claim** → attendi la conferma.
5. Apri Metamask su **Base Sepolia** → dopo qualche minuto dovresti vedere gli ETH testnet.

### B) Faucet Sepolia (Ethereum) + **bridge** verso Base Sepolia
1. Vai su un **Sepolia faucet** (Ethereum testnet), per esempio:
   - `https://sepoliafaucet.com/` (o altri faucet affidabili).
2. Incolla il tuo indirizzo `0x...` e clicca **Request** → ricevi **Sepolia ETH** (non Base).
3. Apri un **bridge** che supporti **Sepolia → Base Sepolia** (cerca “Base Sepolia bridge testnet”):
   - Connetti Metamask (prima seleziona rete **Sepolia**, poi l’app del bridge farà lo switch).
   - Seleziona **da: Sepolia** → **a: Base Sepolia**.
   - Indica la quantità di ETH di test da bridgiare.
   - Clicca **Bridge / Transfer**, **Conferma** su Metamask.
   - Attendi la finalizzazione → passa qualche minuto.
4. Torna su Metamask → seleziona **Base Sepolia** → dovresti vedere gli **ETH bridgiati**.

> **Tip:** se un bridge non funziona, prova un altro faucet che dia direttamente ETH su Base Sepolia. L’obiettivo è semplice: avere qualche **0.1–0.5 ETH** di test su Base Sepolia.

---

## Scaricare e preparare il progetto Hardhat di FIA
1. **Scarica lo zip** pronto: **`fia-hardhat.zip`** (che contiene contratto, script e config).  
2. **Scompatta** in una cartella, esempio: `~/Projects/fia-hardhat`.
3. Apri un **terminal** dentro quella cartella e installa le dipendenze:
   ```bash
   npm install
   ```

### Struttura della cartella (principali)
```
fia-hardhat/
  ├─ contracts/
  │   ├─ FIACoin.sol
  │   ├─ LPTimelock.sol
  │   └─ NFTTimelock.sol
  ├─ scripts/
  │   ├─ deploy.ts
  │   ├─ airdrop.ts
  │   └─ leaderboard.ts
  ├─ hardhat.config.ts
  ├─ .env.example
  ├─ package.json
  └─ README.md
```

---

## Configurare le variabili d’ambiente (.env)
1. Copia `.env.example` in `.env`:
   ```bash
   cp .env.example .env
   ```
2. Apri `.env` e inserisci:
   ```env
   PRIVATE_KEY=0xLA_TUA_PRIVATE_KEY_TESTNET   # Esporta da Metamask → Account → Account details → Export
   RPC_BASE_SEPOLIA=https://sepolia.base.org
   ```
> **IMPORTANTE**: usa **solo** un wallet di **test**. Non mettere mai una private key con fondi veri.

---

## Compilare e fare il deploy del contratto FIA su Base Sepolia
### 1) Compilazione
```bash
npx hardhat compile
```

### 2) Deploy
```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```
Output atteso (esempio):
```
Deployer: 0x1234...ABCD
FIA deployed at: 0xABCD...EF01
```
Copia l’indirizzo del token **FIA** e aprilo su **https://sepolia.basescan.org** per vederlo.

### 3) Test veloce: invia a te stesso
- In Metamask → **Import token** → incolla l’indirizzo del token FIA.  
- Invia qualche FIA da Metamask a un tuo secondo account test → verifica la transazione e l’**evento `Fingered`** su BaseScan (tab “Logs”).

---

## Verificare il contratto su BaseScan (opzionale ma consigliato)
**Metodo manuale (web UI):**
1. Apri la pagina del tuo contratto su **sepolia.basescan.org**.
2. Clicca **Verify and Publish**.
3. Seleziona:
   - **Solidity (Single file)** o “Multi-part” se richiesto.
   - **Versione di compilatore**: usa la stessa di Hardhat (es. 0.8.20).
   - **Opzioni**: abilita “Optimize” come nel tuo setup (di default sì).
4. Incolla il sorgente **FIACoin.sol** (con gli import risolti o “flattened”).  
   - Se serve, usa **hardhat flatten** (puoi aggiungere il plugin `hardhat-flatten` oppure copiare manualmente gli import di OpenZeppelin).
5. Inserisci i **constructor arguments**: per `FIACoin` sono gli **indirizzi** `treasury` e `founder` passati nello script di deploy (in `deploy.ts`, inizialmente uguali al tuo address test).
6. Conferma. Dopo la verifica, la pagina del contratto mostrerà il **sorgente leggibile** (ottimo per la trasparenza).

> In alternativa, puoi usare il plugin di verifica Hardhat, ma per semplicità la UI web è più intuitiva da zero.

---

## Eseguire un airdrop di test
1. Apri `scripts/airdrop.ts` e inserisci indirizzi e quantità (in **token interi**, lo script farà i 18 decimali):
   ```ts
   const ADDRS: Array<[string, number]> = [
     ["0xAmico1...", 10000],
     ["0xAmico2...", 5000],
   ];
   ```
2. Esegui lo script passando l’indirizzo del token via env:
   ```bash
   FIA_ADDR=0xIL_TUO_TOKEN npx hardhat run scripts/airdrop.ts --network baseSepolia
   ```
3. Gli amici vedranno i token arrivare (controlla su BaseScan / Metamask).

> **Nota**: l’airdrop consuma gas (di test). Assicurati di avere ETH testnet sufficienti.

---

## Creare/mostrare la Liquidity Pool e simularne il lock
Su testnet l’obiettivo è **dimostrare** che sai creare la LP e **bloccarla**.

### Opzione A — Stile v2 (LP = ERC‑20) **(più semplice da spiegare)**
1. Se hai accesso a un **DEX v2 su Base Sepolia** con interfaccia:
   - Crea coppia **FIA / ETH** → **Add Liquidity** (es. 500M FIA + 1 ETH testnet).
   - Riceverai **LP token ERC‑20** nel wallet (si chiamano tipo `UNI-V2` o simili).
2. **Lock degli LP** (dimostrazione):
   - Deploy del contratto `LPTimelock.sol` (con **Remix** su Base Sepolia):
     - `_lp` = **indirizzo del token LP** (lo trovi su BaseScan nella pagina della pool o nel tuo wallet come “token ricevuto”).
     - `_unlockTime` = timestamp futuro (es. tra 30 giorni → cerca “epoch converter” per un timestamp).
   - In Metamask approva il contratto timelock a **spendere** i tuoi LP (funzione `approve` del token LP).
   - Chiama `deposit(amount)` su `LPTimelock` per trasferire gli LP nel contratto di lock.
   - Mostra su BaseScan che **il saldo LP è nel timelock**.

### Opzione B — Uniswap v3 (LP = NFT) **(più “pro”, ma meno immediato)**
1. Crea una posizione di liquidità v3 (se l’UI testnet lo consente) → ricevi un **NFT** (tokenId) che rappresenta la tua LP.
2. Deploy `NFTTimelock.sol` con:
   - `_nft` = **indirizzo del NonfungiblePositionManager** su Base Sepolia (cercarlo su documentazione/scan).
   - `_tokenId` = l’id dell’NFT LP appena creato.
   - `_unlockTime` = timestamp futuro.
3. Chiama `approve` sul PositionManager per dare permesso al timelock.
4. Esegui `safeTransferFrom(tuo_wallet, timelock, tokenId)`.
5. BaseScan mostrerà **owner = timelock** per quel tokenId (quindi **bloccato** fino alla data).

> Per una **demo rapida**, l’opzione **v2** con `LPTimelock` è più facile da comunicare alla community (“ho lockato gli LP per N mesi, ecco il link”).

---

## Leggere gli eventi e generare la leaderboard
1. Fai qualche **transfer** tra amici per generare eventi `Fingered`.
2. Esegui:
   ```bash
   FIA_ADDR=0xIL_TUO_TOKEN npx hardhat run scripts/leaderboard.ts --network baseSepolia
   ```
3. Output atteso (esempio):
   ```
   Top 10 Biggest Fingerer (given):
   0xAbc...  12345.67

   Top 10 Biggest Receiver:
   0xDef...  9876.54
   ```
4. Copia/incolla la classifica nel gruppo Telegram/Discord per la **gara goliardica**.

---

## NFT “Butt Badges” (opzionale)
- Puoi creare un semplice **ERC‑721 di test** con 1–2 immagini meme.  
- **Mint** manuale agli indirizzi top della leaderboard (es. “Biggest Fingerer of the Month”).  
- Scopo: **premiare** e **rafforzare la community**.

---

## Next Steps (roadmap pratica)
1. **Stabilire tokenomics definitiva** e pubblicarla (già vista: 1B supply, 10% founder, 50% LP, 30% airdrop, 10% treasury).
2. **Preparare comunicazione** (Twitter/X, Telegram, Discord, meme pack iniziale, sticker, GIF).
3. **Deploy mainnet su Base**:
   - Configura fee exemptions (router DEX, coppia LP, locker).
   - Crea LP (preferibilmente v2 per lock semplice) e **lock** per ≥ 6–12 mesi (link pubblico).
   - Airdrop iniziale (scaglionato per evitare dump istantaneo).
4. **Lancio leaderboard + NFT** (mensile).
5. **(Opz.) Renounce Ownership** dopo aver configurato tutto per massima fiducia.
6. **Misura metriche**: holder, volume, fee generate, burn totale, attività social.

---

## Contratti e script inclusi
> Questi file sono già nel pacchetto **`fia-hardhat.zip`** che ti ho fornito.

### `contracts/FIACoin.sol` (estratto)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FIACoin is ERC20, Ownable {
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    uint256 public totalFeeBP = 100;     // 1%
    uint256 public feeToTreasuryBP = 50; // 0.5%
    uint256 public feeToFounderBP  = 20; // 0.2%
    uint256 public feeToBurnBP     = 30; // 0.3%

    address public treasury;
    address public founderWallet;

    mapping(address => bool) public isFeeExempt;

    event Fingered(address indexed from, address indexed to, uint256 amount);

    constructor(address _treasury, address _founder)
        ERC20("Finger In Ass", "FIA")
        Ownable(msg.sender)
    {
        require(_treasury != address(0) && _founder != address(0), "zero addr");
        treasury = _treasury;
        founderWallet = _founder;
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
        isFeeExempt[msg.sender] = true;
        isFeeExempt[_treasury]  = true;
        isFeeExempt[_founder]   = true;
    }

    function burn(uint256 amount) external { _burn(msg.sender, amount); }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || totalFeeBP == 0 || isFeeExempt[from] || isFeeExempt[to]) {
            super._update(from, to, value);
            if (from != address(0) && to != address(0)) emit Fingered(from, to, value);
            return;
        }
        uint256 feeAmount = (value * totalFeeBP) / 10_000;
        uint256 toTreasury = (feeAmount * feeToTreasuryBP) / totalFeeBP;
        uint256 toFounder  = (feeAmount * feeToFounderBP)  / totalFeeBP;
        uint256 toBurn     = (feeAmount * feeToBurnBP)     / totalFeeBP;
        uint256 sendAmount = value - feeAmount;
        super._update(from, to, sendAmount);
        if (toTreasury > 0) super._update(from, treasury, toTreasury);
        if (toFounder  > 0) super._update(from, founderWallet, toFounder);
        if (toBurn     > 0) _burn(from, toBurn);
        emit Fingered(from, to, value);
    }
}
```

### `contracts/LPTimelock.sol` (estratto)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract LPTimelock {
    address public owner;
    IERC20 public immutable lp;
    uint256 public immutable unlockTime;

    constructor(address _lp, uint256 _unlockTime) {
        owner = msg.sender;
        lp = IERC20(_lp);
        unlockTime = _unlockTime;
    }

    function deposit(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        require(lp.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= unlockTime, "locked");
        uint256 bal = lp.balanceOf(address(this));
        require(lp.transfer(owner, bal), "transfer failed");
    }
}
```

### `contracts/NFTTimelock.sol` (estratto)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract NFTTimelock {
    address public owner;
    IERC721 public immutable nft;
    uint256 public immutable tokenId;
    uint256 public immutable unlockTime;

    constructor(address _nft, uint256 _tokenId, uint256 _unlockTime) {
        owner = msg.sender;
        nft = IERC721(_nft);
        tokenId = _tokenId;
        unlockTime = _unlockTime;
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= unlockTime, "locked");
        nft.safeTransferFrom(address(this), owner, tokenId);
    }
}
```

### `scripts/deploy.ts` (estratto)
```ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = deployer.address; // TODO: sostituisci con treasury reale
  const founder  = deployer.address; // TODO: sostituisci con founder wallet

  const FIA = await ethers.getContractFactory("FIACoin");
  const fia = await FIA.deploy(treasury, founder);
  await fia.waitForDeployment();
  console.log("FIA deployed at:", await fia.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### `scripts/airdrop.ts` (estratto)
```ts
import { ethers } from "hardhat";

const ADDRS: Array<[string, number]> = [
  // ["0xFriend1...", 10_000],
  // ["0xFriend2...", 5_000],
];

async function main() {
  const fiaAddr = process.env.FIA_ADDR as string;
  if (!fiaAddr) throw new Error("Set FIA_ADDR=0x...");

  const FIA = await ethers.getContractAt("FIACoin", fiaAddr);
  for (const [addr, amt] of ADDRS) {
    const tx = await FIA.transfer(addr, ethers.parseUnits(String(amt), 18));
    await tx.wait();
    console.log("Airdropped", amt, "FIA to", addr);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

### `scripts/leaderboard.ts` (estratto)
```ts
import { ethers } from "hardhat";

async function main() {
  const fiaAddr = process.env.FIA_ADDR as string;
  const fromBlock = Number(process.env.FROM_BLOCK || 0);
  const toBlock = Number(process.env.TO_BLOCK || "latest");
  if (!fiaAddr) throw new Error("Set FIA_ADDR");

  const FIA = await ethers.getContractAt("FIACoin", fiaAddr);
  const filter = FIA.filters.Fingered();
  const logs = await FIA.queryFilter(filter, fromBlock, toBlock);

  const given: Record<string, bigint> = {};
  const received: Record<string, bigint> = {};

  for (const log of logs) {
    const { from, to, amount } = (log as any).args;
    given[from] = (given[from] || 0n) + amount;
    received[to] = (received[to] || 0n) + amount;
  }

  const sortTop = (m: Record<string, bigint>) =>
    Object.entries(m).sort((a,b) => (b[1] > a[1] ? 1 : -1)).slice(0, 10);

  console.log("\\nTop 10 Biggest Fingerer:");
  for (const [addr, amt] of sortTop(given)) console.log(addr, ethers.formatUnits(amt, 18));

  console.log("\\nTop 10 Biggest Receiver:");
  for (const [addr, amt] of sortTop(received)) console.log(addr, ethers.formatUnits(amt, 18));
}
main().catch((e) => { console.error(e); process.exit(1); });
```

---

## Troubleshooting
- **Non vedo ETH su Base Sepolia**: controlla di essere sulla rete corretta in Metamask. Ripeti faucet o bridge; a volte serve attendere qualche minuto.
- **Deploy fallisce**: verifica `PRIVATE_KEY` in `.env` e che l’account abbia ETH testnet.
- **Verifica su BaseScan non riesce**: stessa versione di Solidity, optimizer on/off coerente, constructor args corretti (gli address passati in `deploy.ts`). In caso, usa la verifica manuale “Single file” con codice flatten.
- **LP lock**: se non trovi un DEX v2 testnet con UI, concentra la demo sul **timelock** (spiega il concetto con `LPTimelock` o `NFTTimelock` e linka il contratto su BaseScan).

---

## Disclaimer
Questa guida e i relativi sorgenti sono a **solo scopo educativo/dimostrativo**.  
Le criptovalute sono **rischiose e altamente volatili**; verifica sempre leggi/regolamenti nel tuo Paese.  
Non condividere mai **private key** o **seed phrase**. Usa account di **test** in testnet.

---

Buon divertimento con **$FIA** 🍑👆 — il meme coin più goliardico e trasparente del quartiere.
