import { z } from "zod";
import {
  DESTINATION_IDS,
  ORIGINS,
  AIRPORTS,
  STAY_LEVELS,
  destinationFor,
  seasonFactor,
  addDays,
} from "./destinations.ts";
import { CITY_INFO } from "./places.ts";
import {
  generateTrip,
  calculateBudget,
  allocation,
  type Trip,
  type Preferences,
} from "./planner.ts";

export const PRICING_VERSION = "editorial-v1";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T12:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid date");
export const quizSchema = z
  .object({
    origin: z.enum(ORIGINS),
    destination: z.enum(DESTINATION_IDS),
    startDate: dateSchema,
    days: z.number().int().min(7).max(14),
    travellers: z.number().int().min(1).max(6),
    budget: z.number().min(100).max(100000),
    budgetMode: z.enum(["group", "person"]),
    interests: z
      .array(z.enum(["Culture", "Food", "Nature", "City life"]))
      .min(1)
      .max(4),
    pace: z.enum(["relaxed", "balanced", "full"]),
  })
  .strict();
export type Quiz = z.infer<typeof quizSchema>;
export type Recommendation = { id: string; title: string; description: string; trip: Trip };
export const DEFAULT_QUIZ: Quiz = {
  origin: "Dublin",
  destination: "japan",
  startDate: addDays(new Date().toISOString().slice(0, 10), 60),
  days: 10,
  travellers: 1,
  budget: 2500,
  budgetMode: "group",
  interests: ["Culture", "Food"],
  pace: "balanced",
};

/** Budget is a constraint, not a price. Never force unaffordable trips under it. */
export function recommendTrips(input: Quiz): Recommendation[] {
  const q = quizSchema.parse(input),
    dest = destinationFor(q.destination);
  const budget = q.budget * (q.budgetMode === "person" ? q.travellers : 1);
  const season = seasonFactor(q.destination, q.startDate);
  const flight = Math.round(dest.flight[q.origin] * season);
  const styles: Preferences["style"][] = [
    "classic",
    q.interests.includes("Nature") ? "nature" : "culture",
    "classic",
  ];
  const titles = [
    "Keep it simple",
    q.interests.includes("Nature") ? "Take the scenic route" : "Follow your curiosity",
    "Stay a little nicer",
  ];
  const descriptions = [
    "Lower-cost stays and more room in your budget.",
    "More time for your interests, with balanced comfort.",
    "More of the available budget goes towards accommodation.",
  ];
  return styles.map((style, i) => {
    const build = (level: 0 | 1 | 2) =>
      generateTrip({
        days: q.days,
        travellers: q.travellers,
        budget,
        origin: q.origin,
        destination: q.destination,
        startDate: q.startDate,
        interests: q.interests,
        pace: q.pace,
        style,
        flight,
        nightly: Math.round(dest.room[level] * season),
        food: dest.food[Math.min(level, i)],
        stayLevel: level,
        pricingVersion: PRICING_VERSION,
      });
    // Value stays intentionally remain simple. Other options upgrade only when affordable.
    let trip = build(0);
    const fraction = [0.78, 0.9, 1][i];
    if (i > 0)
      for (const level of [1, 2] as const) {
        const candidate = build(level);
        if (calculateBudget(candidate).total <= budget * fraction) trip = candidate;
      }
    trip.name = dest.name + " · " + titles[i];
    return {
      id: ["value", "discovery", "comfort"][i],
      title: titles[i],
      description: descriptions[i],
      trip,
    };
  });
}
export function staySuggestions(trip: Trip) {
  const p = trip.preferences,
    dest = destinationFor(p.destination),
    split = allocation(p);
  let offset = 0;
  return dest.cities.map((city, index) => {
    const days = split[city] ?? 0,
      nights = days - (index === dest.cities.length - 1 ? 1 : 0),
      rooms = Math.ceil(p.travellers / 2);
    const checkin = p.startDate ? addDays(p.startDate, offset) : undefined;
    const checkout = checkin ? addDays(checkin, nights) : undefined;
    offset += days;
    const query = new URLSearchParams({
      ss: city + ", " + dest.name,
      group_adults: String(p.travellers),
      no_rooms: String(rooms),
    });
    if (checkin && checkout) {
      query.set("checkin", checkin);
      query.set("checkout", checkout);
    }
    return {
      city,
      area: CITY_INFO[city].area,
      description: CITY_INFO[city].stay,
      type: STAY_LEVELS[p.stayLevel ?? 0],
      rooms,
      nights,
      nightly: p.nightly,
      total: p.nightly * rooms * nights,
      checkin,
      checkout,
      url: "https://www.booking.com/searchresults.html?" + query,
    };
  });
}
export function flightSuggestion(trip: Trip) {
  const p = trip.preferences,
    dest = destinationFor(p.destination);
  const origin = AIRPORTS[p.origin as keyof typeof AIRPORTS] ?? p.origin;
  const [arrival, departure] = dest.airports;
  const query = `Flights ${origin} to ${arrival}, return ${departure} to ${origin} ${p.startDate ?? ""} ${p.startDate ? addDays(p.startDate, p.days - 1) : ""}`;
  return {
    origin,
    arrival,
    departure,
    perPerson: p.flight,
    total: p.flight * p.travellers,
    url: "https://www.google.com/travel/flights?q=" + encodeURIComponent(query),
  };
}
