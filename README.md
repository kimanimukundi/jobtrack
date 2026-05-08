# JobTrack Kenya

Real-time IT job, internship, attachment, and government tender tracker for Kenya.

## Features

- 🔍 **Auto-discovers jobs** from Fuzu, BrighterMonday, MyJobMag, PPRA, and more
- 🌐 **Track any site** — add company career pages, RSS feeds, LinkedIn, or social media
- ⚡ **Auto-checks** every 6 hours (configurable per site), plus manual refresh
- 🔔 **Real-time notifications** when new jobs appear on tracked sites
- 📧 **Email alerts** via Resend (free tier)
- 👥 **Public platform** — anyone can sign up and use it
- 💾 **Save & track** application status (saved → applied → shortlisted)

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend + API | Next.js 14 | Free (Vercel) |
| Database + Auth | Supabase | Free tier |
| Job search API | JSearch (RapidAPI) | Free (200 req/month) |
| Email | Resend | Free (3,000/month) |
| Cron jobs | Vercel Cron | Free |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd jobtrack
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial_schema.sql`
3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
4. In **Authentication → Providers**, enable **Google** (optional but recommended):
   - Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
   - Add your Supabase callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

### 3. Get a JSearch API key (free)

1. Go to [rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
2. Sign up and subscribe to the **Basic (free)** plan
3. Copy your RapidAPI key

### 4. Set up Resend (free email, optional)

1. Go to [resend.com](https://resend.com) and sign up
2. Add and verify your domain (or use the sandbox for testing)
3. Copy your API key

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RAPIDAPI_KEY=your_key_here
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
CRON_SECRET=make_up_any_random_string_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Then in Vercel dashboard:
1. Go to **Settings → Environment Variables** and add all your `.env.local` values
2. The `vercel.json` already configures the cron job to run every 6 hours
3. Add `CRON_SECRET` to Vercel env vars — Vercel will send it as a header automatically

For the cron to work on Vercel, update `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── dashboard/
│   │   ├── page.tsx             # Main dashboard
│   │   └── saved/page.tsx       # Saved jobs
│   ├── jobs/page.tsx            # Browse all jobs
│   ├── sites/page.tsx           # Manage tracked sites
│   ├── notifications/page.tsx   # Notification center
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts    # OAuth callback
│   └── api/
│       ├── jobs/route.ts        # List/search jobs
│       ├── sites/
│       │   ├── route.ts         # CRUD tracked sites
│       │   └── refresh/route.ts # Manual refresh
│       └── cron/route.ts        # Auto-check all sources
├── components/
│   └── layout/
│       ├── Navbar.tsx
│       └── AuthProvider.tsx
├── lib/
│   ├── supabase.ts              # DB client helpers
│   ├── discovery.ts             # RSS, JSearch, scraper
│   └── email.ts                 # Email notifications
└── types/index.ts               # TypeScript types
```

---

## Adding More Job Sources

### RSS Feed
Any site with an RSS feed can be tracked automatically. Add user-facing via the **Sites** page, or add to the `system_sources` table in Supabase directly.

### Custom scraper
Edit `src/lib/discovery.ts` → `scrapeCareerPage()`. Add site-specific CSS selectors for better extraction from specific sites.

### Twitter/X
Twitter's free API only allows read access to public tweets. To track a company's Twitter for job posts:
1. Use `nitter.net` as a free RSS proxy: `https://nitter.net/{username}/rss`
2. Add it as an RSS source

### WhatsApp Groups
WhatsApp has no public API. The workaround: create a Telegram channel that mirrors job WhatsApp groups, then track the Telegram channel's RSS feed (`https://t.me/s/{channel_name}` scraped via the website scraper).

---

## Expanding Beyond IT Jobs

The platform is already category-aware. To expand:

1. Add more `system_sources` entries in Supabase for non-IT boards
2. Users can add any site via the tracked sites page
3. The `type` field in jobs supports: `job`, `internship`, `attachment`, `tender`
4. Tender tracking: PPRA (ppra.go.ke) publishes procurement notices — add as a tracked site

---

## Roadmap

- [ ] Chrome extension to clip jobs from any page in one click
- [ ] Keyword alerts (e.g. notify me for any "React" job)
- [ ] Job recommendations based on saved jobs
- [ ] Admin panel to manage system sources
- [ ] Mobile app (React Native)
- [ ] Government jobs portal integration (PSC Kenya)
