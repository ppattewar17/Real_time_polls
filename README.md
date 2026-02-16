This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Real-Time Polls Application

A real-time polling application with Socket.IO, Next.js, and PostgreSQL featuring robust anti-abuse mechanisms.

## Anti-Abuse & Fairness Mechanisms

This application implements **2 distinct anti-abuse mechanisms** to ensure fair voting:

### 1. Browser Fingerprinting (Client-Side + Server Validation)

**What it prevents:**
- Multiple votes from the same browser/device
- Vote manipulation through page refresh
- Duplicate voting attempts

**How it's enforced:**
- Generates unique browser fingerprint using canvas rendering, screen resolution, timezone, language, and hardware specs
- Fingerprint stored in localStorage and sent with each vote
- Server validates fingerprint against database before accepting vote
- Returns 409 Conflict if fingerprint already voted

**Implementation:** `lib/fingerprint.ts` + `app/api/vote/route.ts` (lines 60-70)

**Limitations:**
- Can be bypassed by clearing browser data or using incognito mode
- Different browsers on same device = different fingerprints

### 2. IP Address Tracking (Server-Side)

**What it prevents:**
- Multiple votes from the same network/location
- Automated bot voting from single IP
- Vote farming from same connection

**How it's enforced:**
- Extracts client IP from request headers (x-forwarded-for, x-real-ip, cf-connecting-ip)
- Stores IP address with each vote in database
- Checks both fingerprint AND IP before allowing vote
- Returns 409 Conflict if IP already voted on poll

**Implementation:** `lib/rateLimit.ts` (getClientIp) + `app/api/vote/route.ts` (lines 60-70)

**Limitations:**
- Users behind same NAT/proxy share IP
- VPN/proxy can change IP address
- Dynamic IPs may allow revoting after IP change

### 3. Rate Limiting (Bonus Protection)

**What it prevents:**
- Rapid-fire voting attempts
- Automated bot attacks
- API abuse

**How it's enforced:**
- In-memory rate limiter: 1 vote per 5 seconds per IP+Poll combination
- Returns 429 Too Many Requests with Retry-After header
- Automatic cleanup of expired rate limit entries

**Implementation:** `lib/rateLimit.ts` + `app/api/vote/route.ts` (lines 35-55)

**Limitations:**
- In-memory storage (resets on server restart)
- Not shared across multiple server instances

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Required environment variables for deployment:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NEXT_PUBLIC_SOCKET_URL="https://your-app.vercel.app"
NODE_ENV="production"
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. Push code to GitHub
2. Import project in Vercel
3. Add Vercel Postgres database
4. Set environment variables
5. Deploy

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
