# Data and estimate provenance

## Destination content

The app contains a small editorial place catalogue (104 entries) and fixed three-city routes. Descriptions are authored summaries. Coordinates and visit durations are approximate, suitable for map markers and itinerary heuristics, not navigation or opening-time guarantees.

Country context and official travel information:

- Japan: https://www.japan.travel/en/
- Italy: https://www.italia.it/en/italy
- Portugal: https://www.visitportugal.com/en/destinos

These references provide destination context, **not the prices used by the model**. Check current venue access, ticket prices and closures before travel. Image attribution is in `public/images/ATTRIBUTION.md`; the Italy and Portugal card illustrations are CSS artwork.

## Price assumptions

`shared/destinations.ts` contains illustrative EUR allowances authored for the portfolio demo: flights by origin, three room categories, three meal budgets, intercity and daily transport, and a simple 1.2 seasonal multiplier. They are not sourced market averages, live quotes or a fare prediction model. Entry costs in the place catalogue are also rough allowances.

The `editorial-v1` identifier records the estimate model in newly saved trip preferences. A future provider integration should supply timestamped offers, availability and provider attribution, and retain estimated fallback results with a clear label.

## Recommendation method

Value keeps a simple room category. Discovery can upgrade when the candidate total fits within 90% of the group budget. Comfort can upgrade when it fits the full budget. All totals already include a 10% contingency. Unused budget remains unused; an unaffordable basic trip is reported as over budget.

A greedy itinerary heuristic prefers interests, matching route style, affordable activities and nearby stops. It is deterministic and tested; it does not guarantee a globally optimal route.
