import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { get } from "node:http";
import { createApp } from "../server/app.ts";
import { openTripStore } from "../server/database.ts";
import { DEFAULTS, generateTrip } from "../shared/planner.ts";
import { DEFAULT_QUIZ } from '../shared/recommendations.ts';
import { tripSchema } from '../shared/validation.ts';

test("local API saves, lists and deletes trips; SQLite survives reopening", async () => {
  const folder = mkdtempSync(join(tmpdir(), "tabi-test-"));
  const filename = join(folder, "test.sqlite");
  const store = openTripStore(filename);
  const server = createApp(store).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const recommendationResponse = await fetch(base + '/api/recommendations', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...DEFAULT_QUIZ,destination:'italy'}),
    });
    assert.equal(recommendationResponse.status,200);
    const {recommendations}=await recommendationResponse.json();
    assert.equal(recommendations.length,3);
    const trip=tripSchema.parse(recommendations[1].trip);
    assert.equal(trip.preferences.destination,'italy');
    const response = await fetch(base + "/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });
    assert.equal(response.status, 201);
    const { id } = await response.json();
    const listing = await fetch(base + "/api/trips");
    assert.equal(listing.headers.get("cache-control"), "no-store");
    assert.deepEqual((await listing.json()).trips[0].trip, trip);
    const reopened = openTripStore(filename);
    try {
      assert.equal(reopened.list()[0].id, id);
    } finally {
      reopened.close();
    }
    assert.equal((await fetch(base + "/api/trips/" + id, { method: "DELETE" })).status, 200);
    assert.equal((await fetch(base + "/api/trips/" + id, { method: "DELETE" })).status, 404);
    assert.deepEqual((await (await fetch(base + "/api/trips")).json()).trips, []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
    rmSync(folder, { recursive: true });
  }
});

test("API rejects invalid trips and requests from external web pages", async () => {
  const store = openTripStore(":memory:");
  const server = createApp(store).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(base+'/api/recommendations', {
      method:'POST',headers:{'Content-Type':'application/json'},body:'{}',
    })).status,400);
    for (const body of ["{", "{}", JSON.stringify({ ...generateTrip(DEFAULTS), days: [] })]) {
      assert.equal(
        (
          await fetch(base + "/api/trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (await fetch(base + "/api/trips", { headers: { Origin: "https://example.com" } })).status,
      403,
    );
    // fetch normalizes Host, so use HTTP directly to simulate DNS rebinding.
    const hostileHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      get(base + "/api/trips", { headers: { Host: "example.com" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).on("error", reject);
    });
    assert.equal(hostileHostStatus, 403);
    assert.equal((await fetch(base + "/api/trips/bad-id", { method: "DELETE" })).status, 400);
    assert.equal((await fetch(base + "/api/missing")).status, 404);
    assert.equal(store.list().length, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
});
