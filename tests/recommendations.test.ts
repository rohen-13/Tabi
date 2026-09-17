import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_QUIZ,
  recommendTrips,
  staySuggestions,
  flightSuggestion,
  quizSchema,
} from "../shared/recommendations.ts";
import { calculateBudget } from "../shared/planner.ts";
import { tripSchema } from "../shared/validation.ts";
import { DESTINATION_IDS, destinationFor } from "../shared/destinations.ts";

const quiz = { ...DEFAULT_QUIZ, startDate: "2027-05-10" };
test("departure airport and season materially change flight estimates", () => {
  const dublin = recommendTrips(quiz)[0].trip;
  const cork = recommendTrips({ ...quiz, origin: "Cork" })[0].trip;
  const highSeason = recommendTrips({ ...quiz, startDate: "2027-04-10" })[0].trip;
  assert.ok(cork.preferences.flight > dublin.preferences.flight);
  assert.ok(highSeason.preferences.flight > dublin.preferences.flight);
  assert.equal(flightSuggestion(cork).origin, "ORK");
});
test("increasing budget upgrades accommodation automatically, without spending all of it", () => {
  const modest = recommendTrips({ ...quiz, budget: 2300 })[2].trip;
  const generous = recommendTrips({ ...quiz, budget: 5000 })[2].trip;
  assert.ok(generous.preferences.nightly > modest.preferences.nightly);
  assert.ok(calculateBudget(generous).total < 5000);
  assert.equal(generous.preferences.flight, modest.preferences.flight);
});
test("group and per-person budgets are normalized; impossible budgets remain over budget", () => {
  const a = recommendTrips({ ...quiz, travellers: 2, budget: 2500, budgetMode: "person" });
  const b = recommendTrips({ ...quiz, travellers: 2, budget: 5000, budgetMode: "group" });
  assert.deepEqual(a, b);
  for (const option of recommendTrips({ ...quiz, budget: 100 }))
    assert.ok(calculateBudget(option.trip).total > 100);
});
test("all destinations, lengths and paces produce valid routes and consistent hotel totals", () => {
  for (const destination of DESTINATION_IDS)
    for (let days = 7; days <= 14; days++)
      for (const pace of ["relaxed", "balanced", "full"] as const) {
        for (const { trip } of recommendTrips({
          ...quiz,
          destination,
          days,
          pace,
          travellers: 3,
          budget: 8000,
        })) {
          assert.equal(
            tripSchema.safeParse(trip).success,
            true,
            JSON.stringify({ destination, days, pace }),
          );
          assert.ok(
            trip.days.every((day) => destinationFor(destination).cities.includes(day.city)),
          );
          const stays = staySuggestions(trip),
            budget = calculateBudget(trip);
          assert.equal(
            stays.reduce((sum, s) => sum + s.nights, 0),
            days - 1,
          );
          assert.equal(
            stays.reduce((sum, s) => sum + s.total, 0),
            budget.stays,
          );
          assert.equal(stays[0].checkin, quiz.startDate);
          assert.equal(stays[0].checkout, stays[1].checkin);
          assert.equal(stays[1].checkout, stays[2].checkin);
          assert.ok(stays.every((s) => s.rooms === 2));
        }
      }
});
test("quiz rejects unknown countries, origins, invalid calendar dates and missing interests", () => {
  for (const invalid of [
    { destination: "unknown" },
    { origin: "Atlantis" },
    { startDate: "2027-02-30" },
    { interests: [] },
    { budget: NaN },
  ])
    assert.equal(quizSchema.safeParse({ ...quiz, ...invalid }).success, false);
});
