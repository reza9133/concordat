# Concordat Frontend

A modern, multi-page React + TypeScript dApp for the **Concordat** intelligent contract system on GenLayer Studionet.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Framer Motion** (animations)
- **React Router v6** (multi-page routing)
- **genlayer-js** (GenLayer SDK)
- **lucide-react** (icons)

## Contract

| | |
|---|---|
| **Contract** | `ConcordatHall` |
| **Address** | `0x7F0b950E72E9674D5712c13BAe05f4FbA2250Cb5` |
| **Network** | GenLayer Studionet |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with animated hero and live stats |
| `/app` | Main dApp dashboard — connect wallet, browse and file cases |
| `/cases/:address` | Case detail — status, rulings, appeals, actions |
| `/rulebook` | Browse all rules; owner can add/retire rules |
| `/standings` | Look up any member's reputation standing |
| `/docs` | Full documentation with sidebar navigation |
| `/how-it-works` | Animated step-by-step guide |

## Quick Start

```bash
cd concordat/frontend
npm install
npm run dev
# → http://localhost:5173
```

## Environment Variables

Copy `.env.example` to `.env` (already pre-filled):

```
VITE_CONTRACT_ADDRESS=0x7F0b950E72E9674D5712c13BAe05f4FbA2250Cb5
```

## Build for Production

```bash
npm run build
# Output in dist/
```

The `public/_redirects` file is already configured for Cloudflare Pages SPA routing:
```
/* /index.html 200
```

## Deploy to Cloudflare Pages

1. Push the `concordat/frontend` folder to your GitHub repo.
2. In Cloudflare Pages, create a new project connected to that repo.
3. Set build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `concordat/frontend` (if monorepo)
4. Add environment variable: `VITE_CONTRACT_ADDRESS=0x7F0b950E72E9674D5712c13BAe05f4FbA2250Cb5`
5. Deploy — every push to main auto-deploys via GitHub → Cloudflare.

## Project Structure

```
frontend/
├── public/
│   ├── favicon.svg          # Concordat favicon
│   ├── genlayer-logo.png    # GenLayer brand logo
│   └── _redirects           # Cloudflare Pages SPA routing
├── src/
│   ├── components/
│   │   ├── concordat/       # Domain-specific components
│   │   ├── layout/          # Navbar, Footer, logos
│   │   ├── ui/              # Reusable UI primitives
│   │   └── wallet/          # Wallet connection UI
│   ├── hooks/               # React hooks (wallet, contract, toast)
│   ├── lib/                 # GenLayer client + wallet utilities
│   ├── pages/               # Page components (one per route)
│   └── types/               # TypeScript type definitions
├── .env                     # Local env (git-ignored)
├── .env.example             # Template
├── tailwind.config.js       # Custom design tokens
└── vite.config.ts
```

## Wallet Support

The app uses **EIP-6963** wallet discovery for broad wallet support (MetaMask, Rabby, etc.) with automatic fallback to `window.ethereum`. Write operations require:
1. A connected wallet
2. The wallet must be on **GenLayer Studionet** (the app prompts to switch automatically)

Read operations (browsing cases, rules, standings) work **without any wallet**.
