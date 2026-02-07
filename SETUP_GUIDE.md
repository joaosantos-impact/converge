# 🚀 Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Exchange accounts with API access

## Step-by-Step Setup

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Database Setup

Create a PostgreSQL database:

```bash
# Using psql
createdb converge

# Or using GUI tools like pgAdmin, TablePlus, etc.
```

### 3️⃣ Environment Configuration

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Database connection
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/converge?schema=public"

# At least one exchange is required
BINANCE_API_KEY=your_binance_key_here
BINANCE_API_SECRET=your_binance_secret_here
```

**⚠️ Security Tips:**
- Use **read-only** API keys
- Enable IP whitelist on exchange
- Never share your `.env` file

### 4️⃣ Database Migration

Run Prisma migrations to create tables:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5️⃣ Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) 🎉

## First Steps After Setup

### 1. Sync Your Portfolio

Click the **"↻ Sync"** button in the dashboard to fetch your balances from all configured exchanges.

### 2. Explore Features

- **Portfolio Tab**: See your total value, P&L, and asset distribution
- **Analytics Tab**: View trading history and performance metrics
- **Alerts Tab**: Coming soon - set price alerts

### 3. View Database (Optional)

Open Prisma Studio to inspect your data:

```bash
npx prisma studio
```

## Troubleshooting

### "Command not found: prisma"

Make sure you installed dependencies:

```bash
npm install
```

### Database connection error

1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in `.env`
3. Test connection: `psql -d converge`

### Exchange API errors

1. Verify API keys are correct
2. Check API key permissions (must have "read" access)
3. Ensure keys are not IP-restricted (or add your IP)
4. Check exchange API status page

### "CCXT exchange not found"

Supported exchanges:
- Binance
- Bybit
- MEXC
- Kraken
- OKX

To add more, edit `lib/exchanges.ts`

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database management
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Create new migration
npx prisma generate         # Generate Prisma client

# Check types
npm run lint
```

## Next Steps

1. **Customize**: Edit colors in `app/globals.css`
2. **Add Exchanges**: Configure more exchanges in `.env`
3. **Deploy**: Push to Vercel or Railway
4. **Create Content**: Use analytics for your social media posts!

## Need Help?

- 📖 Check the main [README.md](./README.md)
- 🔍 Review [CCXT Documentation](https://docs.ccxt.com)
- 💬 Open an issue on GitHub

---

Happy trading! 📈
