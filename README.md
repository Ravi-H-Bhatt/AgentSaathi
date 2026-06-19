# AgentSaathi

A finance-grade workspace for insurance agents. Upload policy PDFs, auto-extract
the details, track renewals, project premium changes, and ask an AI assistant
that answers **only** from your own data. Built to run entirely on free tiers.

- **Framework:** Next.js 16 (App Router) + React 19 + Tailwind v4
- **Backend:** Supabase (Postgres + Auth + Storage, with Row Level Security)
- **AI:** Groq (`llama-3.3-70b-versatile`) for PDF extraction + grounded assistant
- **Email:** Gmail SMTP via Nodemailer
- **PDF reports:** jsPDF (client-side)
- **Hosting:** Vercel

---

## Features

- **Google sign-in** with an admin/agent role split.
- **Agent approval workflow** — new agents are `pending` until the admin approves them.
- **PDF upload + extraction** — text-based PDFs are parsed by AI into editable fields you review before saving. Scanned/image PDFs fall back to manual entry.
- **Client directory** — alphabetical, instant search by name / policy number / email.
- **Client detail** — every policy, downloadable PDF report, one-click renewal email.
- **Renewal dashboard** — this month's renewals + summary metrics.
- **Grounded AI assistant** — retrieves your own clients/policies and answers from them only.
- **Admin premium charts** — upload or hand-enter age-wise premium bands.
- **Premium-change alerts** — flags policies whose premium will change as the client ages.
- **Automated reminders** — daily Vercel Cron sends reminders for policies renewing within 30 days.

---

## Why no separate vector DB?

The assistant is grounded on your structured policy rows, retrieved directly from
Postgres and passed to the model as context. For this kind of exact, per-agent
record lookup that's more accurate (and simpler/cheaper) than fuzzy vector search,
and it stays fully on the free tier. The schema is ready to add `pgvector` later
if you ever need semantic search over long free-text notes.

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier).
2. **SQL Editor → New query** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → Run. This creates all tables, RLS policies, and the private `policy-files` storage bucket.
3. **Project Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

### 3. Enable Google sign-in

1. In Supabase: **Authentication → Providers → Google** → enable.
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Paste the Google client ID/secret into Supabase.
4. In Supabase **Authentication → URL Configuration**, add your site URL and
   `http://localhost:3000` to the redirect allow-list.

### 4. Groq

Create a free key at [console.groq.com/keys](https://console.groq.com/keys) → `GROQ_API_KEY`.

### 5. Gmail SMTP

1. Enable 2-Step Verification on the Gmail account.
2. Create an **App Password** (Google Account → Security → App passwords).
3. Set `SMTP_USER` (the Gmail address) and `SMTP_PASS` (the 16-char app password).

### 6. Admin

`NEXT_PUBLIC_ADMIN_EMAIL` is already set to `ravihbhatt05@gmail.com`. When that
account signs in with Google it's auto-promoted to admin. Everyone else starts as
a pending agent and must be approved from the admin **Agents** page.

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add every variable from `.env.example` in **Project → Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL).
4. Add your Vercel domain to Supabase's redirect allow-list and Google's authorized origins.
5. Deploy. The `vercel.json` cron triggers `/api/cron/renewals` daily at 04:00 UTC —
   set `CRON_SECRET` and the cron will send the matching `Authorization` header automatically.

---

## Project structure

```
src/
  app/
    (app)/            Agent area (dashboard, clients, upload) — gated to approved agents
    admin/            Admin area (agent approvals, premium charts) — gated to admin
    api/              Route handlers (extract, policies, assistant, send-renewal, cron)
    auth/             OAuth callback + sign-out
    login/  pending/  Auth entry + waiting-for-approval
  components/         UI (shells, landing, assistant, forms, tables)
  lib/                supabase clients, auth, groq, pdf, email, premium, data, format
supabase/schema.sql   Database + RLS + storage setup
```

---

## Security notes

- All agent data is isolated with Postgres **Row Level Security**; agents can only read/write their own clients, policies, and emails.
- The Supabase **service role key** is used only in server code (route handlers / server actions) after verifying the caller's identity and role. It is never exposed to the browser.
- Uploaded PDFs live in a **private** storage bucket scoped to each agent's folder.
- The cron endpoint is protected by `CRON_SECRET`.
