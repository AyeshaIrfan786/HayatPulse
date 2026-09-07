# HayatPulse 

**Live app:** [hayat-pulse-ten.vercel.app](https://hayat-pulse-ten.vercel.app)

HayatPulse is a unified emergency-health platform for Pakistan, bringing together 16 modules — ICU bed tracking, offline SMS fallback, CNIC-linked medical history, Pakistan Sign Language translation, AI diagnostics, epidemic heatmaps, Urdu voice/mental-health triage, blood donor matching, tele-clinics, flood rescue pins, maternal monitoring, and child immunization tracking — into one dashboard.

## Tech Stack

- **React 19** + **TypeScript**
- **TanStack Start / TanStack Router** (file-based routing, SSR)
- **Vite** for dev/build tooling
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Supabase** (Postgres, Auth, backend data)
- **TanStack Query** for data fetching
- **Zod** + **React Hook Form** for forms/validation
- **Recharts** for data visualization

## Modules

| # | Module | Category |
|---|--------|----------|
| 1 | Emergency ICU & Bed Mesh | Emergency |
| 2 | Offline GSM / SMS Fallback | Resilience |
| 3 | CNIC Medical History Vault | Vault |
| 4 | PakSign PSL Portal | Inclusion |
| 5 | AI Vision Diagnostics | Diagnostics |
| 6 | Prescription OCR & Drug Safety | Diagnostics |
| 7 | Epidemic Heatmapping | Surveillance |
| 8 | Urdu Mental Health Companion | Triage |
| 9 | Native Urdu Voice Triage | Triage |
| 10 | Emergency Blood Matcher | Emergency |
| 11 | Low-Bandwidth Tele-Clinic | Rural care |
| 12 | Mobile BHU Van Dispatcher | Rural care |
| 13 | Disaster Flood Rescue Pins | Resilience |
| 14 | Maternal & Chronic Monitor | Care |
| 15 | Snakebite & First-Aid Engine | Emergency |
| 16 | Child Immunization Tracker | Care |

## Project Structure

```
Frontend/
├── src/
│   ├── routes/          # File-based routes (index, login, dashboard, module/:id)
│   ├── features/        # Standalone feature modules (first-aid, ICU mesh, PSL portal, etc.)
│   ├── components/       # Shared/UI components
│   ├── lib/              # Supabase client, auth context, module registry, utils
│   ├── styles.css
│   ├── router.tsx
│   ├── server.ts
│   └── start.ts
├── supabase/
│   └── schema.sql        # Postgres schema (hospitals, patients, blood_donors, etc.)
├── public/
├── package.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- A Supabase project

### 1. Install dependencies

```bash
pnpm install
# or
npm install
# or
bun install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_VISION_API_BASE=your_vision_api_base_url
VITE_MATERNAL_API_BASE=your_maternal_api_base_url
```

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase project's SQL editor. This creates the core tables (`hospitals`, `patients`, `blood_donors`, and more) that the frontend reads from directly — there's no demo/fallback data, so the schema must be applied before the app will show live data.

### 4. Run the dev server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000` (or the port Vite assigns).

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm build:dev` | Build in development mode |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

## Backend

The backend runs on **Supabase** (Postgres + Auth), configured via the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables, with a few auxiliary AI/vision services (Groq, vision API, maternal-monitoring API) reachable through their own env-configured base URLs. Live deployment: **[hayat-pulse-ten.vercel.app](https://hayat-pulse-ten.vercel.app)** 

## Deployment

The app is deployed on **Vercel**. Pushing to the connected branch triggers an automatic build using the `build` script; make sure the same environment variables from `.env` are set in the Vercel project settings.

## License

Private / Proprietary — all rights reserved.
