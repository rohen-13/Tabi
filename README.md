# Tabi — Japan, your way

A full-stack Japan trip planner built for a software engineering portfolio. Turn a budget and a few interests into an editable itinerary across Tokyo, Kyoto and Osaka.

## What works

- Instant demo without application sign-in.
- 7–14 days in Japan, 1–6 travellers, three trip styles and three activity paces.
- 44 curated places with coordinates, categories, time estimates and illustrative entry allowances.
- Deterministic itinerary selection based on interests, budget pressure and geographic proximity.
- Whole-trip and per-day interactive Leaflet maps.
- Replace, add or remove stops without duplicating places or exceeding daily time limits.
- Transparent group budgets including room sharing, flights, food, transport, activities and a 10% contingency.
- Authenticated cloud saving, listing and deletion of itinerary snapshots.
- Plain-text export without signing in.
- Responsive layouts, keyboard-accessible dialogs, recoverable error states and optional WebMCP tools.

## Stack

| Layer | Technology |
|---|---|
| Interface | React 19, TypeScript, Tailwind CSS, shadcn/Radix primitives |
| Application framework | Next.js App Router conventions running through Cloudflare Vinext + Vite |
| Runtime | Cloudflare Workers, deployed through Sites |
| Storage | Cloudflare D1 (SQLite), prepared statements, Drizzle schema migrations |
| Identity | Platform-managed Sign in with ChatGPT |
| Maps | Leaflet and OpenStreetMap tiles |
| Validation | Zod shared between browser and API |
| Tests | Node.js built-in test runner |

This build uses **D1 rather than Supabase** and **Sites rather than Vercel** so cloud storage and deployment work in the available environment. It is not a conventional Vercel-hosted Next.js build. Vinext is a beta compatibility runtime; migration to native Next.js would require replacing Worker/D1 integration and authentication.

## Run locally

Prerequisites: Node.js 24 and npm.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_abnormal_pestilence.sql
npm run dev -- --hostname 127.0.0.1
```

Open the local URL printed by the server, normally http://127.0.0.1:5173.

Apply the initial migration **once per fresh local database**. Development and the built Worker share `.wrangler/state`. Do not replay an already-applied migration.

The local “Sign in with ChatGPT” route uses the starter’s development identity. It is a mock for local testing, not real OAuth. Hosted identity is supplied by the Sites platform. The demo planner itself does not need an account, but this deployment currently has **owner-only site access** at the user’s request.

No flight API, map API key or AI API key is required. Maps need internet access; an unavailable tile provider does not prevent editing or exporting a trip.

## Verification

```sh
npm test
npm run typecheck
npm run build
# With the development server running and local migration applied:
npm run test:api
```

The algorithm suite tests 72 combinations of duration, style and pace, unique places, city ordering, time limits, group/room arithmetic, replacement validity, invalid inputs and budget pressure.

The API smoke test is restricted to localhost. It creates a disposable trip under the local mock identity, verifies save/read and authentication/input/origin checks, then deletes that test trip.

Browser checks cover preference changes, over-budget feedback, place replacement, map modes, the sign-in draft handoff, saved-trip listing and mobile layout. WebMCP valid/invalid inputs were tested with state read-back.

## Architecture

```text
app/page.tsx                   Server entry and optional identity
components/planner.tsx         Planner UI and shared actions
components/trip-map.tsx        Client-only Leaflet map lifecycle
lib/places.ts                  Curated destination catalogue
lib/planner.ts                 Pure itinerary and budget functions
lib/validation.ts              Shared validation and invariants
app/api/trips/route.ts         Authenticated REST endpoints
db/trips.ts                    Owner-scoped prepared statements
db/schema.ts / drizzle/        Relational schema and migration
tests/                        Algorithm and local API checks
```

The route splits days across the three cities, scores unused candidates against interests/style and budget pressure, and penalises distance from the previous stop. It then fills each day up to an activity count and time capacity, including 30-minute local buffers. Intercity days reserve an additional three hours. This is a greedy heuristic, not an optimal route solver or live transport router.

Every saved trip is validated on the server. The owner is derived from trusted platform identity, never from submitted JSON. Reads and deletions include the owner in the SQL predicate. SQL values are bound parameters. API responses are not cached. Session storage is used only for a temporary draft during sign-in; saved records live in D1.

## API

| Method | Endpoint | Behaviour |
|---|---|---|
| GET | /api/trips | Current user’s latest 50 snapshots; anonymous visitors receive an empty list |
| POST | /api/trips | Validate and save a new snapshot; requires identity |
| DELETE | /api/trips?id=... | Delete a snapshot belonging to the current user |

The 50-trip guard is an MVP limit, not a transactional rate limiter. A public, high-traffic release should add rate limiting and stronger concurrency controls.

## Deliberate limits

- Japan only; Tokyo, Kyoto and Osaka only.
- All prices are illustrative EUR allowances. There are no live flights, hotel availability checks or bookings.
- Flight and hotel costs are editable inputs. Stay links lead to an external city search.
- No date-specific opening hours, timetable checks, currency conversions or travel-time matrix.
- Dotted map lines indicate stop order, not a walking/driving route.
- Time budgets use approximate visit durations and fixed transfer buffers.
- The finite place catalogue may leave days open on long or busy itineraries.
- Saved trips are snapshots, not collaborative documents.
- Text export is supported; PDF and calendar export are future extensions.
- Keep the demo private until you choose to change the site’s access policy.

## Image credits

All bundled photographs are CC0, with optional attribution retained:

- [Tokyo — Joe Lewandowski](https://commons.wikimedia.org/wiki/File:Urban_Tokyo_panorama_(Unsplash).jpg)
- [Kyoto — M338](https://commons.wikimedia.org/wiki/File:Fushimi_Inari-taisha_sembon-torii.jpg)
- [Osaka — Sakai Yayoi](https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_yoru_00.jpg)

Destination reference links are included in the app’s “Good to know” tab.

See [PORTFOLIO.md](./PORTFOLIO.md) for a project summary and an interview demonstration script.
