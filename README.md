# OrdinalSwap

A trustless peer-to-peer Bitcoin Ordinals trading platform. Swap inscriptions directly between two Xverse wallets using **Partially Signed Bitcoin Transactions (PSBTs)** — no escrow, no middleman, atomic settlement on-chain.

![OrdinalSwap](https://img.shields.io/badge/Bitcoin-Ordinals-orange?style=flat-square&logo=bitcoin)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## How It Works

1. **Initiator** connects Xverse, picks an inscription, gets a shareable trade link
2. **Counterparty** opens the link, connects Xverse, picks their inscription to offer
3. Both parties independently **sign** their input via Xverse's PSBT signing API
4. Either party **broadcasts** the fully-signed PSBT — both inscriptions swap atomically

The PSBT structure:
- Input 0 → Initiator's inscription UTXO (signed by initiator)
- Input 1 → Counterparty's inscription UTXO (signed by counterparty)
- Output 0 → Initiator's address receives counterparty's inscription
- Output 1 → Counterparty's address receives initiator's inscription

**Neither party can be cheated.** Either both transfers happen or neither does.

---

## Tech Stack

- **React 18** — frontend framework
- **React Router v6** — routing
- **bitcoinjs-lib** — PSBT construction and combining
- **SatsConnect / Xverse API** — wallet connection and PSBT signing
- **Hiro Ordinals API** — inscription data and UTXO lookups (free, no auth)
- **mempool.space API** — transaction broadcasting

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Xverse Wallet](https://www.xverse.app/) browser extension (for production use)

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/ordinals-swap
cd ordinals-swap
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

Deploy the `build/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.js              # Top nav with wallet connect
│   ├── InscriptionCard.js     # Single inscription display
│   └── InscriptionPicker.js   # Browse + select from wallet
├── hooks/
│   ├── useWallet.js           # Xverse wallet connection state
│   └── useTrades.js           # Trade state management
├── pages/
│   ├── Home.js                # Landing page
│   ├── CreateTrade.js         # Initiate a trade
│   ├── TradePage.js           # View/accept/sign a trade
│   └── MyTrades.js            # Trade history
└── utils/
    ├── ordinalsApi.js          # Hiro API helpers
    └── psbt.js                 # PSBT build/sign/combine/broadcast
```

---

## Production Considerations

### Backend / Real-time Sync
Currently trade state is stored in `localStorage`. For a real multi-user deployment you'll need:
- A backend database (Supabase, Firebase, PlanetScale) to store trade state server-side
- Real-time updates via WebSocket or polling so both parties see live status changes
- The trade ID in the URL is the coordination key — both parties load the same trade object

### Fee Handling
The current PSBT builder creates outputs for the inscriptions only. In production you need to:
- Add one or both parties' payment UTXOs as additional inputs to cover network fees
- Calculate fee based on transaction weight and current fee rate (from mempool.space API)

### Security
- Validate inscription ownership on the server before building the PSBT
- Ensure the inscription satpoint is correctly mapped to the UTXO
- Consider adding a timeout/expiry mechanism for trades

---

## Wallet Integration Reference

- [Xverse SatsConnect Docs](https://docs.xverse.app/sats-connect)
- [Hiro Ordinals API Docs](https://docs.hiro.so/ordinals)
- [PSBT (BIP-174)](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)

---

## License

MIT
# OrdinalSwap
