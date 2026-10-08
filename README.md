# Agro Rakshak

**An agriculture-focused assistant for crop questions and plant health checks.**

Agro Rakshak helps growers describe a problem or upload a crop photo, then provides a cautious, structured starting point for investigation. It supports farming topics including crops, fruits, vegetables, pests, soil, irrigation, farm inputs, tools, and machinery.

> AI-generated guidance is informational. Image predictions are not confirmed diagnoses; verify important decisions with a local agricultural expert and follow local regulations and product labels.

## Features

- **Text-based farming help** for crop care, growing conditions, symptoms, and farm operations.
- **Crop photo analysis** using an in-browser TensorFlow.js image classifier.
- **Practical action plans** with likely causes, tools, and follow-up steps.
- **Agriculture-only responses** through the AI service.
- **Accounts and private history** with Supabase Auth and row-level database policies.
- **AI provider options** for Groq Cloud and local Ollama use.
- **Responsive interface** for desktop and mobile screens.

## How it works

1. A grower describes a farming question or provides a crop photo.
2. For photos, the browser model checks whether its prediction is clear enough to continue.
3. The assistant returns a structured answer and practical next steps, or asks for more information when evidence is uncertain.
4. Signed-in users can sync diagnosis history through Supabase.

Photo confidence thresholds are conservative safeguards, not calibrated probabilities. The app avoids specific pesticide, fungicide, herbicide, and insecticide products, ingredients, and application rates; consult local agricultural guidance before chemical treatment.

## Technology

- React, TypeScript, and Vite
- TensorFlow.js and Teachable Machine image classification
- Supabase Auth and Postgres for accounts and history
- Groq API for hosted AI responses
- Ollama as an optional local AI provider
- Node.js API handler for local development and Vercel Functions for deployment

## Quick start

### Requirements

- Node.js and npm
- A Supabase project for account sign-in and synced history
- A Groq API key to use the hosted AI provider

### Install

```bash
git clone https://github.com/jaspreetxd/Farm-AI.git
cd Farm-AI
npm ci
```

Copy `.env.example` to `.env.local`, then set the values you need.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS or Linux:

```bash
cp .env.example .env.local
```

Example variable names:

```dotenv
VITE_LLM_PROVIDER=auto
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
GROQ_API_KEY=your-server-only-groq-key
```

Keep `GROQ_API_KEY` server-side. Never place a Groq key, Supabase secret key, or service-role key in a `VITE_` or `NEXT_PUBLIC_` variable.

### Configure Supabase

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It creates the diagnosis-history table and row-level security policies.
2. Add your local URL (usually `http://localhost:5173/**`) to the Supabase Auth redirect URL allow list.
3. After deployment, add the Vercel URL to the Supabase Site URL and redirect URL allow list.

The browser uses a Supabase **publishable** key (or legacy **anon** key). Keep Row Level Security enabled; the app does not need a Supabase secret or service-role key in the browser.

### Run locally

```bash
npm run dev
```

Vite serves the app and `/api/llm` on the same development address. Requests to `/ollama` are proxied to a local Ollama server on port 11434.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the built frontend |
| `npm start` | Serve `dist` and the API with the Node server |
| `npm run lint` | Run ESLint |

## Deploy to Vercel

The repository includes a Vercel Function at `/api/llm` and a rewrite for client-side routes.

1. Import the GitHub repository into Vercel.
2. Connect the Supabase integration, or add the project variables manually.
3. Ensure the Production environment has:
   - `GROQ_API_KEY` — a server-only Groq key.
   - The Supabase project URL and a publishable/anon key. The frontend accepts either `VITE_SUPABASE_URL` with `VITE_SUPABASE_ANON_KEY`, or the integration's `NEXT_PUBLIC_SUPABASE_URL` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also accepted).
4. Deploy or redeploy after changing environment variables; Vite embeds public configuration during the build.
5. Add the deployed domain to Supabase Auth's Site URL and redirect URL allow list.

Only publishable/anon Supabase keys belong in browser-visible variables. Do not use `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `GROQ_API_KEY` with a public prefix.

## API and security notes

- `/api/llm` requires a valid Supabase access token, limits request size and concurrency, and applies per-user and per-IP request windows.
- The server verifies users with the Supabase URL and public publishable/anon key; it does not need a service-role key.
- Rate-limit counters are process-local and can reset between Vercel serverless invocations or instances. They are best-effort safeguards; use a shared store for durable limits as usage grows.
- Keep `.env.local` out of Git. Configure production secrets in Vercel's environment settings.

## Project layout

```text
api/                         Vercel API function
api-handler.js               Shared API validation and AI request handling
api-server.mjs               Local production-style Node server
src/Components/              Interface components
src/pages/                   Home, account, and information pages
src/services/Auth/           Supabase client and authentication
src/services/HistoryService/ Diagnosis history storage
src/services/LLMService/     Groq/Ollama requests and response validation
src/services/ResultAI/       Image classification and diagnosis safeguards
public/tm-my-image-model/    Bundled Teachable Machine model
supabase/schema.sql          History table and row-level security policies
```
