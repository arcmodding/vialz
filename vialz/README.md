# vialz.lol

A personal profile platform. Each user gets a page at `vialz.lol/username` with their links, bio, music, and style.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS)

## Local setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema.** In the Supabase dashboard, open SQL Editor, paste `supabase/schema.sql`, and run it. Then run each file in `supabase/migrations/` in order.
3. **Configure auth URLs.** In Authentication → URL Configuration, set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a redirect URL.
4. **Add environment variables.**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Project Settings → API. Never use the service role key here.
5. **Install and run.**
   ```bash
   npm install
   npm run dev
   ```
6. **Make yourself an admin.** Sign up, then run this in the SQL Editor:
   ```sql
   update public.profiles set is_admin = true where username = 'yourname';
   ```

## Badges, premium, and analytics

- **Badges** are defined in the `badges` table and granted from `/admin`. Owner-only badges are enforced in the database. The Premium badge appears automatically while a plan is active.
- **Premium codes** are generated at `/admin/codes`. Only a SHA-256 hash is stored, and each code is shown once at creation. Users redeem codes on their dashboard. Codes can have a duration, a use limit, and an expiry date.
- **Premium** unlocks analytics at `/dashboard/analytics`, 30 links, and the animated glow effect. The database enforces these limits.
- **Link clicks** go through `/r/[id]`, which counts the click and redirects.

## Deploy

Deploy to Vercel by importing this repository. Add the three variables from `.env.example` in Project Settings → Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to your production domain, then add `https://your-domain/auth/callback` to Supabase's redirect URLs.

## Project structure

```
app/
  page.tsx              Homepage
  [username]/page.tsx   Public profile
  dashboard/page.tsx    Profile editor
  admin/page.tsx        User moderation (admins only)
  login/, signup/       Auth pages
  auth/callback/        Email confirmation
  actions.ts            All server actions (auth, profile, admin)
components/             Client components (forms, music player)
lib/                    Config, validation schemas, Supabase server client
supabase/schema.sql     Tables, RLS policies, and database functions
middleware.ts           Session refresh and route protection
```

## Security model

- Row-level security limits each user to their own profile and links.
- Column-level grants keep `is_admin`, `banned`, and `views` out of user reach.
- Admin actions run through a database function that checks the caller's admin flag.
- All input is validated with Zod on the server and constrained again in Postgres.
