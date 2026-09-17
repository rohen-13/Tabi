# Tabi — Find your kind of trip

A full-stack travel planner that turns a short quiz into three trip options, with automatic cost estimates, editable itineraries and a persistent trip library. Built with React, TypeScript, Express, PostgreSQL, Docker Compose and Leaflet. SQLite is available for a lightweight local run.

## What the application does

1. Choose a departure city and a destination: Japan, Italy or Portugal.
2. Answer a three-step quiz about dates, duration, travellers, budget, interests and pace.
3. Compare three options with group and per-person costs and a clear budget surplus or shortfall.
4. Explore the daily route, change stops, inspect airport and accommodation plans, save and export.

Departure city affects the flight allowance. Travel month affects the seasonal allowance. Available budget determines which accommodation category fits. Group sizes affect flights, meals, tickets and the number of shared private rooms. You no longer enter flight, hotel or meal prices yourself.

**Estimates are illustrative model outputs, not live flight fares or hotel offers.** No booking API, account or paid API key is required.

## Start with Docker and PostgreSQL

Install and start Docker Desktop. On first setup only:

```sh
cp .env.example .env
```

Choose a local URL-safe password in `.env` (letters and digits). Keep this file out of Git. If `.env` already exists, preserve it: it may contain the password for your existing database volume.

```sh
docker compose up -d --build --wait
```

Open http://127.0.0.1:5173. Docker builds the frontend and runs two services: `app` and `db`. PostgreSQL uses a named persistent volume. Both published ports bind only to this computer.

```sh
docker compose ps                         # container status
docker compose logs --tail=50 app         # app logs
docker compose exec db psql -U tabi -d tabi # SQL console
docker compose stop                      # stop without deleting data
docker compose start                     # start existing containers again
```

Do not run `docker compose down -v` unless you intend to delete the database volume. Changing the password in `.env` does not change the password inside an already initialized PostgreSQL volume.

The macOS `Start Tabi.command` launcher also supports this workflow. For Docker details, read [DOCKER_RU.md](DOCKER_RU.md).

## Develop without Docker

Install Node.js 24 or newer, then:

```sh
npm ci
npm run dev
```

This runs the app at the same address, using `data/tabi.sqlite`. Stop the Docker `app` service first if it already occupies port 5173. SQLite and PostgreSQL are separate libraries; switching between them does not migrate saved trips.

For the built frontend: `npm run build`, then `npm start`. The TypeScript server uses `tsx`, so keep development dependencies installed for this workflow.

Optional environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string; if absent, SQLite is used |
| `TABI_DB_PATH` | Alternative SQLite file path |
| `PORT` | HTTP port, default 5173 |
| `HOST` | Default 127.0.0.1; Compose sets 0.0.0.0 inside the container |
| `TEST_DATABASE_URL` | Dedicated PostgreSQL database for integration tests |

## Architecture

```text
React quiz → POST /api/recommendations → validated recommendation engine
React plan → GET/POST/DELETE /api/trips → storage interface → PostgreSQL or SQLite
Leaflet map → OpenStreetMap tiles (internet needed)
```

- `src/App.tsx`: home, results, navigation and trip library.
- `src/components/TripQuiz.tsx`: the three quiz steps.
- `src/components/TripDetail.tsx`: route editor, flights, stays and budget.
- `shared/recommendations.ts`: quiz schema, cost category selection and travel-search links.
- `shared/destinations.ts`: supported origins, country routes and versioned editorial price assumptions.
- `shared/planner.ts`: greedy place selection, time limits and budget arithmetic.
- `shared/places.ts`, `shared/data/europe.ts`: 104 curated places across nine cities.
- `shared/validation.ts`: validation of saved itinerary snapshots, including uniqueness and daily capacity.
- `server/app.ts`: HTTP API, input validation and local-origin checks.
- `server/database.ts`, `server/postgres.ts`: prepared SQLite / parameterized PostgreSQL queries.
- `Dockerfile`, `compose.yaml`: reproducible local app and database environment.

The model is deterministic and explainable, not AI. First it sets a route/season flight allowance, then selects affordable room categories for each option. It generates city days and greedily chooses unused places using interest, cost pressure, proximity and time limits. A 10% buffer is added to the total. If even basic costs exceed the budget, the result stays over budget instead of promising fictional availability.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/recommendations` | Validate quiz answers and calculate three options |
| GET | `/api/trips` | List saved snapshots |
| POST | `/api/trips` | Validate and save a snapshot |
| DELETE | `/api/trips/:id` | Delete a snapshot |
| GET | `/api/health` | Check app status and storage mode |

Trips are stored as JSON/JSONB snapshots with a UUID and creation timestamp. A relational model and migrations would be the next step for shared place catalogues, collaboration or analytics.

## Tests

```sh
npm test
npm run build
```

Without `TEST_DATABASE_URL`, the PostgreSQL integration test is skipped. GitHub Actions supplies a PostgreSQL 17 service and runs the full suite. The tests cover all supported country/duration/pace combinations, costs, hotel-night consistency, origin/season effects, budget upgrades, invalid inputs, API operations, persistence and local-origin rejection. UI verification is manual.

## Deliberate scope

- Three countries, predefined three-city routes, 7–14 destination days, 1–6 adults, four departure airports.
- Editorial allowances, not scraped, measured or live market prices. See [DATA_SOURCES.md](DATA_SOURCES.md).
- Suggested accommodation areas and categories, not named hotels with confirmed availability.
- Flight links are multi-city search prompts, not verified airline services.
- No date-specific opening checks, walking routes, timetable API, visa advice, live currency or booking engine.
- Finite place lists may leave free time on long itineraries; the app does not repeat places to fill space.
- Saving creates a snapshot; unsaved edits reset on refresh.
- Local single-user application, with no login. Public deployment needs explicit access/authentication design and a hosting decision. Nothing here deploys to the internet.

[Russian walkthrough](GUIDE_RU.md) · [Interview guide](PORTFOLIO.md) · [Docker explained](DOCKER_RU.md) · [Image credits](public/images/ATTRIBUTION.md)
