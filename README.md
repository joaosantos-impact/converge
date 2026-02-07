# Converge - Crypto Portfolio Aggregator

Converge is a full-stack cryptocurrency portfolio aggregator that connects multiple exchanges (Binance, Bybit, MEXC, Kraken, OKX) into a single dashboard. Track holdings, analyze trades, share performance, and manage tax compliance from one place.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL + Prisma ORM 7 |
| Styling | Tailwind CSS 4 |
| Auth | Better Auth (email/password, 2FA) |
| Exchange API | CCXT |
| Data Fetching | React Query |
| Charts | Recharts |
| Validation | Zod |

## Features

- **Multi-Exchange Portfolio** - Aggregated view of assets across Binance, Bybit, MEXC, Kraken, OKX
- **Trade History** - Full trading history with up to 5-year backfill, filtering by symbol/side/exchange
- **Portfolio Analytics** - P&L tracking, historical snapshots (24h, 7d, 30d, 90d, 1y), LTTB downsampling
- **Social Feed** - Share trades with privacy controls, likes, comments, follow system
- **Leaderboard** - User rankings based on performance
- **Tax Compliance** - Portugal-focused IRS reporting with CSV/PDF export
- **DCA Calculator** - Dollar-cost averaging simulator
- **Price Alerts** - Configurable price movement notifications
- **Security** - AES-256-GCM encryption for API keys, 2FA support, rate limiting
- **Admin Panel** - Blog management, reviews, user oversight

## Project Structure

```
converge/
├── frontend/              # Next.js 16 (App Router)
│   ├── app/               # Pages and layouts
│   │   ├── dashboard/     # Authenticated dashboard pages
│   │   ├── sign-in/       # Auth pages
│   │   └── sign-up/
│   ├── components/        # React components + shadcn/ui
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Services, types, utilities
├── backend/               # NestJS 11 API
│   └── src/
│       ├── auth/          # Authentication (Better Auth, 2FA)
│       ├── exchanges/     # CCXT integration, encryption
│       ├── portfolio/     # Portfolio aggregation
│       ├── sync/          # Exchange data synchronization
│       ├── trades/        # Trade history
│       ├── feed/          # Social feed
│       ├── admin/         # Admin endpoints
│       └── common/        # Guards, decorators, filters
├── prisma/                # Database schema and migrations
└── package.json           # Monorepo root (npm workspaces)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `*` | `/api/auth/*` | Better Auth (login, register, 2FA) |
| `POST` | `/api/auth/change-password` | Change password |
| `POST` | `/api/auth/delete-account` | Delete account |
| `GET` | `/api/exchange-accounts` | List connected exchanges |
| `POST` | `/api/exchange-accounts` | Add exchange (validates credentials) |
| `PATCH` | `/api/exchange-accounts` | Update exchange credentials |
| `DELETE` | `/api/exchange-accounts` | Remove exchange |
| `GET` | `/api/portfolio` | Aggregated portfolio + P&L |
| `GET` | `/api/portfolio/history` | Historical snapshots (24h-all) |
| `GET/POST` | `/api/sync` | Check/trigger sync |
| `GET` | `/api/trades` | Trade history with filters |
| `GET/POST/DELETE` | `/api/feed` | Social feed CRUD |
| `POST/DELETE` | `/api/feed/like` | Like/unlike posts |
| `GET` | `/api/health` | Health check |

## Database Schema

Key models managed by Prisma:

- **User / Session / Account** - Authentication (Better Auth)
- **ExchangeAccount** - Exchange connections with encrypted API keys
- **Balance** - Current holdings per asset per exchange
- **Trade** - Trading history (deduplicated by exchange trade ID)
- **PortfolioSnapshot** - Daily portfolio value history
- **SyncLog** - Sync operation tracking
- **Post / PostLike / PostComment** - Social feed
- **Follow** - User relationships
- **BlogPost / Review** - Content management
- **PriceAlert** - Price alert configurations

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Bun (used as package manager)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd converge
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values (see .env.example for all variables)

# Database setup
npx prisma migrate dev --name init
npx prisma generate

# Start development
npm run dev
```

This starts:
- Frontend on `http://localhost:3000`
- Backend on `http://localhost:4000`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars) |
| `BETTER_AUTH_URL` | App URL (`http://localhost:3000`) |
| `ENCRYPTION_KEY` | AES-256 key for API key encryption |
| `ENCRYPTION_SALT` | Salt for key derivation |
| `TWITTER_BEARER_TOKEN` | Twitter/X API for news feed |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `NEXT_PUBLIC_API_URL` | Backend URL (`http://localhost:4000`) |

### Common Commands

```bash
npm run dev              # Start both frontend + backend
npm run build            # Build both for production
npm run lint             # ESLint (frontend)
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create migration
```

## Security

- Exchange API keys encrypted with **AES-256-GCM** before database storage
- Read-only API keys recommended (no trading/withdrawal access)
- **2FA** support via TOTP
- Session-based auth with 7-day expiration
- Rate limiting on sensitive endpoints
- Security headers (CSP, HSTS, X-Frame-Options)
- CORS configured per environment

## Deployment

### Docker (Backend)

```bash
cd backend
docker build -t converge-api .
docker run -p 4000:4000 --env-file ../.env converge-api
```

### Vercel (Frontend)

Deploy via Vercel with environment variables configured in the dashboard.

### Railway

```bash
railway link
railway add  # Add PostgreSQL
railway up
```

## Git Workflow

This project uses a **dev/master** branching strategy:

- `main` (master) - Production-ready code, protected branch
- `dev` - Active development branch

All development happens on `dev`. When changes are pushed to `dev` and pass CI checks (lint + build), they are automatically merged into `main` via GitHub Actions.

See `.github/workflows/ci.yml` for the full pipeline configuration.

## License

MIT

---

Built for crypto traders who want a unified view of their portfolio.
