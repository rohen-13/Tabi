# Tabi: interview walkthrough

## Introduction

“Tabi turns a short travel quiz into three itinerary options for Japan, Italy or Portugal. It calculates an illustrative budget from the departure city, season, group size and accommodation category, then lets users adjust and save a route. I used React and TypeScript, an Express API, PostgreSQL and Docker Compose.”

## Demonstrate in three minutes

1. Choose Cork to Portugal, seven days, two adults and a €3000 group budget.
2. Pick interests and compare the three results.
3. Explain how a larger budget can improve accommodation without artificially inflating flight costs.
4. Open Flights & stays: airport plan, neighbourhood suggestions, nights and room count.
5. Swap a stop, show the updated map and budget, save the trip and reopen it.
6. Show `docker compose ps`, then the `trips` table in PostgreSQL.

## Explain these decisions

**Client/server boundary.** The browser sends quiz answers to POST `/api/recommendations`. The server validates them and returns computed options. Saved trips go through a separate CRUD API. Zod validates runtime input; TypeScript checks code at development time.

**Budget as a constraint.** Rates come from an explicit editorial dataset. The algorithm chooses a room category whose full cost fits, including food, transport, activities and contingency. It reports shortfalls rather than fabricating cheaper fares.

**Route generation.** Days are allocated across cities. Places are scored by interests, style, budget pressure and distance from the last stop. Daily capacities and transfer allowances constrain selection. The algorithm is greedy, explainable and deterministic.

**Persistence.** PostgreSQL stores snapshots as JSONB with UUIDs and timestamps. Queries are parameterized. SQLite implements the same storage interface for a lightweight local setup. The two databases do not automatically synchronize.

**Docker.** A Dockerfile builds the app image; Compose runs the app and PostgreSQL. Health checks control readiness. A named volume keeps trips across container restarts. Secrets are excluded from Git and image build context. Docker is an execution environment, not a database or hosting provider.

**Testing.** Tests check route invariants across countries, durations and paces; origin/season effects; budget upgrades; hotel totals; input validation; CRUD and persistence with SQLite and real PostgreSQL. UI checks are manual.

## CV bullet

Built a full-stack travel planner using React, TypeScript, Express, PostgreSQL and Docker Compose, with a multi-step quiz, budget-constrained recommendations, interactive maps and tested itinerary persistence.

Only claim what you can explain. AI assisted development: review the code and make your own change before presenting it as your work.

## Deliberate limitations and next steps

Prices are demo estimates, not live offers; hotels are suggested areas/categories. There are three curated country routes, no user authentication and no public deployment. Next steps: a real provider API with typed adapters and caching, date-aware venue data, authentication, migrations and hosted backups.

A good first independent change: add a “free activities first” preference with a test, then connect it through the quiz, request schema and recommendation engine.
