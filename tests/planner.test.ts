import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  generateTrip,
  calculateBudget,
  alternatives,
  estimatedDayHours,
  dayCapacity,
} from "../shared/planner.ts";
import { tripSchema, preferencesSchema } from "../shared/validation.ts";
import { PLACES } from "../shared/places.ts";
test("all durations, styles and paces create valid, unique, bounded itineraries", () => {
  for (let days = 7; days <= 14; days++)
    for (const style of ["classic", "culture", "nature"] as const)
      for (const pace of ["relaxed", "balanced", "full"] as const) {
        const trip = generateTrip({ ...DEFAULTS, days, style, pace });
        assert.equal(trip.days.length, days);
        const ids = trip.days.flatMap((d) => d.places);
        assert.equal(new Set(ids).size, ids.length);
        trip.days.forEach((d, i) => {
          assert.ok(d.places.every((id) => PLACES.find((p) => p.id === id)?.city === d.city));
          assert.ok(
            estimatedDayHours(d) <=
              dayCapacity(trip.preferences, i > 0 && trip.days[i - 1].city !== d.city),
          );
        });
        assert.equal(tripSchema.safeParse(trip).success, true);
      }
});
test("room sharing and traveller costs are calculated separately", () => {
  const t = generateTrip(DEFAULTS);
  const one = calculateBudget(t);
  const two = calculateBudget({ ...t, preferences: { ...DEFAULTS, travellers: 2 } });
  assert.equal(two.stays, one.stays);
  assert.equal(two.flights, one.flights * 2);
  assert.equal(two.meals, one.meals * 2);
  assert.equal(two.activities, one.activities * 2);
  const three = calculateBudget({ ...t, preferences: { ...DEFAULTS, travellers: 3 } });
  assert.equal(three.stays, one.stays * 2);
  assert.equal(
    one.total,
    one.flights + one.stays + one.meals + one.transport + one.activities + one.buffer,
  );
});
test("removing a paid stop reduces activities and total budget", () => {
  const t = generateTrip(DEFAULTS),
    before = calculateBudget(t);
  const paid = PLACES.find((p) => p.cost > 0 && t.days.some((d) => d.places.includes(p.id)))!;
  const next = {
    ...t,
    days: t.days.map((d) => ({ ...d, places: d.places.filter((id) => id !== paid.id) })),
  };
  assert.equal(calculateBudget(next).activities, before.activities - paid.cost);
  assert.ok(calculateBudget(next).total < before.total);
});
test("every offered replacement and addition remains valid", () => {
  const trip = generateTrip({ ...DEFAULTS, days: 7 });
  trip.days.forEach((day, i) => {
    for (let slot = 0; slot <= day.places.length; slot++) {
      if (slot === day.places.length && slot >= 4) continue;
      for (const replacement of alternatives(trip, i, slot)) {
        const next = structuredClone(trip);
        next.days[i].places[slot] = replacement.id;
        assert.equal(tripSchema.safeParse(next).success, true, replacement.id);
      }
    }
  });
});
test("interests materially influence the first day", () => {
  const culture = generateTrip({ ...DEFAULTS, interests: ["Culture"] });
  const nature = generateTrip({ ...DEFAULTS, interests: ["Nature"] });
  assert.notDeepEqual(culture.days[0].places, nature.days[0].places);
});
test("rejects invalid numbers, missing interests and forged place IDs", () => {
  assert.equal(preferencesSchema.safeParse({ ...DEFAULTS, budget: -1 }).success, false);
  assert.equal(preferencesSchema.safeParse({ ...DEFAULTS, days: 100 }).success, false);
  assert.equal(preferencesSchema.safeParse({ ...DEFAULTS, interests: [] }).success, false);
  assert.equal(preferencesSchema.safeParse({ ...DEFAULTS, flight: Infinity }).success, false);
  const trip = generateTrip(DEFAULTS);
  trip.days[0].places = ["not-a-place"];
  assert.equal(tripSchema.safeParse(trip).success, false);
});
test("budget pressure favours free experiences without claiming affordability", () => {
  const cheap = generateTrip({ ...DEFAULTS, budget: 100 });
  assert.ok(calculateBudget(cheap).total > 100);
  assert.ok(
    calculateBudget(cheap).activities <= calculateBudget(generateTrip(DEFAULTS)).activities,
  );
});
