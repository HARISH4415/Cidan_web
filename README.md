# CIDAN Regulatory Compliance AI

Frontend demo built with React, TypeScript, and Vite.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` for a production build and `npm run lint` for ESLint.

## Environment

Set these variables in the root `.env` file:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CIDAN_API_URL=
```

Restart Vite after changing environment variables. `.env` files are ignored by Git.
Only the Supabase anon key belongs in this browser app; never add a Supabase
service-role key, backend shared token, or SMTP credentials to a `VITE_*` variable.

## Authentication and data access

- `/login` sends an email OTP through Supabase Auth and allows Supabase Auth to create a new account. Enable email sign-ups in Supabase Auth settings. This open-registration behavior is for demos only; it does not verify bank affiliation or assign a bank profile.
- `/verify-otp` verifies the code with Supabase Auth. Protected pages require a valid Supabase session.
- After successful OTP verification, the app inserts a `login_success` row into `public.user_history`.
- Run `supabase/migrations/20261123200000_user_history_rls.sql` in the Supabase SQL Editor to enable authenticated, per-email history access. The migration grants no history access to anonymous users.
- Configure Supabase Auth email OTP templates and delivery settings in the Supabase dashboard.
- Bank data helpers read the authenticated user's active profile from `public.users` and scope supported reads by its `bank_id`. Database Row Level Security must enforce tenant access; client-side filters are not a security boundary.
- `src/lib/cidanApi.ts` sends the current Supabase access token to the configured FastAPI service. The FastAPI service must validate Supabase JWTs and authorize the user's bank. Never put its shared API token in the browser.

## Current feature status

- Document upload, compliance analysis, deployment, and the AI assistant remain frontend demonstrations. The Copilot has no chat API endpoint in this project, so messages and attachments are not transmitted or stored; the UI reports that limitation instead of displaying mock AI replies. Voice input, when supported by the browser, only fills the composer.
- The Connect with CIDAN configuration modal is UI-only. No integration verification endpoint or integration storage/list API is implemented; Save & Verify adds a session-only, unverified preview and reports that backend verification/storage is unavailable.
- The integration document viewer displays the selected session-only configuration and supports plain-text copy/download when document data is available, but no integration-document retrieval endpoint exists yet. Retrieved rules and original raw responses therefore remain unavailable until the backend contract is implemented.
- Implementing those workflows requires the FastAPI source/API response contracts and the deployed database schema/RLS policies.
