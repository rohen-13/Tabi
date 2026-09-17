import { z } from "zod";
import { tripSchema } from "../shared/validation";
import type { Trip } from "../shared/planner";
import type { Quiz, Recommendation } from "../shared/recommendations";

const savedTripSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  trip: tripSchema,
});
export type SavedTrip = z.infer<typeof savedTripSchema>;

// All requests go to the local Express server on the same origin.
async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Cannot reach the local server. Make sure npm run dev is running.");
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.error : "The request could not be completed.");
  }
  return data;
}

export async function listTrips(): Promise<SavedTrip[]> {
  const data = await request("/api/trips");
  return z.object({ trips: z.array(savedTripSchema) }).parse(data).trips;
}
export async function saveTrip(trip: Trip): Promise<void> {
  await request("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trip),
  });
}
export async function deleteTrip(id: string): Promise<void> {
  await request("/api/trips/" + encodeURIComponent(id), { method: "DELETE" });
}

export async function recommendations(quiz: Quiz): Promise<Recommendation[]> {
  const data = await request("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quiz),
  });
  return z
    .object({
      recommendations: z.array(
        z.object({ id: z.string(), title: z.string(), description: z.string(), trip: tripSchema }),
      ),
    })
    .parse(data).recommendations;
}
