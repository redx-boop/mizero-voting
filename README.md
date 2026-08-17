# 🏆 Mizero Awards — School Voting System

A production-quality web app for school awards voting (Miss Mizero, Mr Mizero,
Best Team, Most Loved Teacher, and any categories the admin adds).

Built with **Next.js (App Router) + TypeScript + Tailwind CSS + Supabase**,
deployed on **Vercel**.

---

## Features

| Page | What it does |
| --- | --- |
| `/` | Hero, voting status, live countdown, category grid, "Start Voting" |
| `/vote` | Pick one candidate per category → review ballot → submit |
| `/results` | Live rankings: votes, percentages, progress bars (admin can hide them) |
| `/login` `/register` | Supabase email/password auth with student ID, name and class |
| `/admin` | Dashboard: stats, category/candidate CRUD, photo upload, election controls, vote reset |

Key guarantees:

- **No double voting** — `UNIQUE(user_id, category_id)` enforced by PostgreSQL.
- **No fake data** — every vote is stored in Supabase; results are counted live.
- **No fake auth** — sessions, RLS and server-side role checks everywhere.
- **No service-role key in the browser** — only the anon key, protected by RLS.

---

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Auth, PostgreSQL, Row Level Security, Storage (photos)
- **Lucide React** — icons
- **Vercel** — deployment

---

## Project structure

```
app/
  page.tsx            Homepage (hero, status, countdown, categories)
  vote/page.tsx       Voting page (server fetch → client interaction)
  results/page.tsx    Live results
  login/page.tsx      Login
  register/page.tsx   Student registration
  admin/page.tsx      Admin dashboard (protected)
  actions/            Server Actions (votes, admin, auth)
  auth/callback/      Email-confirmation redirect handler
components/
  Navbar.tsx          Responsive nav with hamburger menu
  VoteSection.tsx     Selection + review + submit flow
  CandidateCard.tsx   Candidate card with selected/voted states
  ReviewModal.tsx     "Please review your selections" step
  ResultsChart.tsx    Rankings with progress bars
  admin/              Admin dashboard tabs
lib/
  supabase/           Browser + server Supabase clients
  auth.ts             Server-side auth / admin guards
  status.ts           Election open/closed logic
  results.ts          Percentages & rankings from vote counts
  types.ts            Shared TypeScript types
supabase/
  schema.sql          Tables + RLS + unique constraint (run first)
  seed.sql            DEVELOPMENT demo data (run second)
proxy.ts              Refreshes the session cookie
```

---

## 1. Local setup

### 1a. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name (e.g. `mizero-awards`), a strong database password, and a region
   close to your school.
3. Open **Authentication → Providers** and make sure **Email** is enabled.
   (For a quick demo you can turn **off** "Confirm email" in
   **Authentication → Settings** so students don't need to click a link.)

### 1b. Run the database schema

1. Open **SQL Editor** in your Supabase dashboard.
2. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and press
   **Run**. This creates the tables, the duplicate-vote constraint, all RLS
   policies, the results function and the photo storage bucket.

### 1c. Load demo data

1. Copy the contents of [`supabase/seed.sql`](supabase/seed.sql) into the SQL
   Editor and press **Run**.
2. This creates 5 demo categories and 15 demo candidates.
   ⚠️ **This is DEMO data** — delete it before the real election
   (`delete from votes; delete from candidates; delete from categories;`).

### 1d. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values from **Project Settings → API** in Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR-PUBLIC-KEY
```

> Newer Supabase projects issue a **publishable key** (`sb_publishable_…`);
> older ones use an **anon key** (`eyJ…`). Either works — set it in
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> for the legacy format.
>
> **Security note:** only the **public** key goes in this project. Never put
> the `service_role` / secret key in code — it bypasses RLS and would let
> anyone read/write everything. The public key is safe in the browser
> because every query is locked down by Row Level Security.

### 1e. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 2. Create your admin account

1. Register a normal student account at `/register` (e.g. you@school.edu).
2. Promote it to admin in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@school.edu');
```

3. Log out and back in, then visit `/admin`.

---

## 3. How the security works (the important part)

### Authentication
Supabase Auth stores the session in a cookie managed by `@supabase/ssr`
(`lib/supabase/server.ts` + `middleware.ts`). Server components and server
actions call `supabase.auth.getUser()` — this is the only source of truth.

### Roles
The `role` column lives in the **database** (`profiles`), never in the
browser. Pages use `requireAdmin()` (`lib/auth.ts`) and every admin server
action re-checks the role server-side. A student who hand-crafts a request
gets rejected.

### Row Level Security (RLS)
Every table has policies (see `supabase/schema.sql`):
- **votes**: students can insert only *their own* votes, only for active
  candidates in active categories, while the election is open; they can read
  only their own votes.
- **categories / candidates**: anyone can read; only admins can write.
- **profiles**: users read/update only their own row; admins read all.

### Duplicate-vote protection (database level)
```sql
constraint votes_user_category_unique unique (user_id, category_id)
```
PostgreSQL refuses to store a second row for the same student + category,
no matter what the frontend does. The server action (`app/actions/votes.ts`)
also checks before inserting, so users get a friendly message instead of a
database error — but the constraint is the real guarantee.

### Results without leaking votes
Students cannot count other people's votes (RLS). The results page calls
`get_category_results()` — a `SECURITY DEFINER` function that returns only
**aggregated counts** and enforces the admin's visibility setting.

---

## 4. Deploy on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** and import
   the repo. Vercel detects Next.js automatically.
3. Add the same environment variables (project settings → Environment
   Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     if your project uses the legacy anon key)
4. Deploy. 🎉
5. Optional but recommended: in Supabase **Authentication → URL
   Configuration**, set the **Site URL** to your Vercel URL and add it to
   **Redirect URLs** so email confirmation links work.

---

## 5. Running a real election (checklist)

- [ ] Delete the demo seed data.
- [ ] Set the election window in **Admin → Election** (or use the
      "Open/Close voting now" buttons).
- [ ] Create your real categories and candidates (with photos).
- [ ] Decide the results visibility (hidden / visible / after close).
- [ ] Decide whether students can self-register.
- [ ] Share the link with students!

---

## Learning resources

- [Supabase Auth docs](https://supabase.com/docs/guides/auth)
- [Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
