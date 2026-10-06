# Agro Rakshak

Agro Rakshak is a React and TypeScript crop support app. Farmers can describe symptoms or upload a crop photo. Image classification runs in the browser with the bundled Teachable Machine model; text and image diagnosis can use Groq or a local Ollama model.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and anon/publishable key. These two Supabase values are intended for the browser; keep Row Level Security enabled and never put a service-role key in frontend variables.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor. It creates the per-user history table and row-level access policies.
4. To use Groq locally, put `GROQ_API_KEY=...` in `.env.local` or provide it in the server environment. This key is read only by the Node server and must not use a `VITE_` prefix.
5. Add the local app URL (for example `http://localhost:5173/**`) to the Supabase Auth redirect URL allow list.
6. Start the app with `npm run dev`.

Vite serves the app and `/api/llm` on the same development address. Requests to `/ollama` are proxied to Ollama on port 11434. You can select Groq, Ollama, or automatic fallback in AI Engine settings.

Farmers create an account or sign in with email and password. Diagnosis history is stored in Supabase and protected by database policies so a signed-in user can only read or change their own rows. Existing anonymous browser history is not automatically assigned to the first account.

## Production

Run `npm run build`, then `npm start`. The Node server serves `dist` and `/api/llm` on the same origin. Set `GROQ_API_KEY` and, if required by the hosting platform, `PORT` in the server environment. Keep the Groq key server-side. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend build; never use a Supabase service-role key in the browser.

### Deploying to Vercel

The repository includes a Vercel Node Function at `/api/llm` and a rewrite for client-side routes. The frontend accepts either `VITE_SUPABASE_URL` with `VITE_SUPABASE_ANON_KEY`, or the Vercel Supabase integration's `NEXT_PUBLIC_SUPABASE_URL` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy anon key is also accepted). These are public browser settings; never expose a Supabase secret/service-role key or `GROQ_API_KEY` with either public prefix. Add `GROQ_API_KEY` as a server-side Environment Variable in Vercel. Redeploy after changing environment variables. In Supabase Auth settings, add the deployed Vercel URL to the Site URL and redirect URL allow list.

The AI endpoint verifies each caller's Supabase access token with Supabase Auth. The server uses only the public anon/publishable key for that verification; it does not need a service-role key. It also enforces per-IP and per-user request windows, a per-user daily cap, bounded request sizes, and concurrent-request limits. These counters are process-local and reset between serverless invocations or instances, so they are a best-effort safeguard on Vercel; use a shared store (such as Redis) for durable, cross-instance limits before public traffic grows.

## Diagnosis limits

Photo diagnoses are withheld when confidence is below 65%, when the top two model classes are less than 15 percentage points apart, or when the class label is unrecognized. These are conservative defaults, not calibrated guarantees. Confirm important treatment decisions with a local agricultural expert and follow local product labels and guidance.

The app accepts crop photos and text descriptions. Diagnosis history syncs across devices after sign-in; sign-out clears it from the active view.
