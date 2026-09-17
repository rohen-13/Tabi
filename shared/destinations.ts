import type { City } from "./places.ts";

export const DESTINATION_IDS = ["japan", "italy", "portugal"] as const;
export type DestinationId = (typeof DESTINATION_IDS)[number];
export const ORIGINS = ["Dublin", "Cork", "Shannon", "London"] as const;
export type Origin = (typeof ORIGINS)[number];
export const AIRPORTS: Record<Origin, string> = {
  Dublin: "DUB",
  Cork: "ORK",
  Shannon: "SNN",
  London: "LHR",
};
export type Destination = {
  id: DestinationId;
  name: string;
  accent: string;
  symbol: string;
  tagline: string;
  cities: [City, City, City];
  airports: [string, string];
  source: string;
  flight: Record<Origin, number>;
  room: [number, number, number];
  food: [number, number, number];
  rail: number;
  dailyTransport: number;
  busyMonths: number[];
};
// Editorial EUR allowances for the demo, not observed market prices or offers.
export const DESTINATIONS: Record<DestinationId, Destination> = {
  japan: {
    id: "japan",
    name: "Japan",
    accent: "#d7826e",
    symbol: "日本",
    tagline: "Quiet gardens. Bright city nights.",
    cities: ["Tokyo", "Kyoto", "Osaka"],
    airports: ["TYO", "KIX"],
    source: "https://www.japan.travel/en/",
    flight: { Dublin: 820, Cork: 930, Shannon: 980, London: 770 },
    room: [65, 115, 190],
    food: [25, 40, 65],
    rail: 150,
    dailyTransport: 7,
    busyMonths: [3, 4, 10, 11],
  },
  italy: {
    id: "italy",
    name: "Italy",
    accent: "#cba362",
    symbol: "IT",
    tagline: "A little art. A long, lovely lunch.",
    cities: ["Rome", "Florence", "Bologna"],
    airports: ["FCO", "BLQ"],
    source: "https://www.italia.it/en",
    flight: { Dublin: 190, Cork: 250, Shannon: 280, London: 170 },
    room: [85, 140, 220],
    food: [30, 45, 70],
    rail: 85,
    dailyTransport: 7,
    busyMonths: [6, 7, 8],
  },
  portugal: {
    id: "portugal",
    name: "Portugal",
    accent: "#7caaa3",
    symbol: "PT",
    tagline: "Ocean air. Streets worth getting lost in.",
    cities: ["Lisbon", "Coimbra", "Porto"],
    airports: ["LIS", "OPO"],
    source: "https://www.visitportugal.com/en/destinos",
    flight: { Dublin: 160, Cork: 210, Shannon: 230, London: 145 },
    room: [65, 105, 170],
    food: [23, 35, 55],
    rail: 55,
    dailyTransport: 6,
    busyMonths: [6, 7, 8, 9],
  },
};
export const destinationFor = (id?: DestinationId) => DESTINATIONS[id ?? "japan"];
export const ALL_CITIES = [
  "Tokyo",
  "Kyoto",
  "Osaka",
  "Rome",
  "Florence",
  "Bologna",
  "Lisbon",
  "Coimbra",
  "Porto",
] as const;
export const STAY_LEVELS = ["Simple private room", "Comfortable hotel", "Boutique stay"] as const;
export function addDays(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function seasonFactor(destination: DestinationId, date: string) {
  return DESTINATIONS[destination].busyMonths.includes(Number(date.slice(5, 7))) ? 1.2 : 1;
}
