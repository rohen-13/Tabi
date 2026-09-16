# Portfolio presentation

## Project summary

**Tabi — personalised Japan itinerary planner**

A responsive full-stack application that turns travel preferences and a group budget into an editable multi-city itinerary. It combines an interactive map, explainable budget calculations and authenticated cloud persistence.

**Technologies:** React, TypeScript, Next.js App Router conventions / Vinext, Tailwind CSS, Cloudflare Workers, SQLite/D1, Drizzle, Leaflet, Zod.

## Suggested CV entry

Use wording you can personally explain and substantiate:

- Developed a full-stack Japan travel planner with React and TypeScript, interactive maps and authenticated itinerary persistence.
- Implemented a deterministic recommendation heuristic across 44 places, enforcing unique stops and daily time constraints.
- Built owner-scoped REST endpoints with server-side validation and prepared SQL statements; tested itinerary invariants and persistence flows.

Do not claim commercial users, revenue, production traffic or performance improvements that have not been measured. Be ready to explain how development tools and AI assistance were used.

## Two-minute demo

1. Open the planner. Explain the user problem: connecting destinations, time and budget.
2. Set seven days, two travellers, nature interests and a relaxed pace.
3. Compare the group estimate with the budget. Explain one room for two travellers.
4. Switch cities and days, then show the per-day map.
5. Replace a paid stop with a free-entry option and show the recalculated budget.
6. Save a named trip, open My trips, and reopen the snapshot.
7. Export the itinerary.
8. Show the tests and describe one limitation you would address next.

## Technical discussion points

- Why a deterministic greedy heuristic is a good first version: reproducible, explainable and testable.
- Why geographical proximity is not the same as real travel time.
- Why server-side ownership checks are necessary even when the UI hides actions.
- Why a shared Zod schema is useful, and why it does not replace authorisation.
- Why flight costs scale per person but room costs scale per room.
- Why SQL snapshots were chosen for the MVP, and when to normalise itinerary days and stops.
- Trade-offs of the beta Vinext runtime versus native Next.js.
- How to migrate storage/authentication if targeting a different hosting provider.

## Before sending applications

The hosted site is currently private by request. Recruiters cannot open it until you intentionally change access.

The project source is available locally and in the Sites source repository. A GitHub repository has not been created on your behalf. When ready, publish the source to your own GitHub, add the demo link, and replace any project ownership details as appropriate.

Practise explaining the core functions in `lib/planner.ts` and the ownership predicates in `db/trips.ts` before including the project in your CV.
