import test from "node:test";
import assert from "node:assert/strict";
import { openPostgresStore } from "../server/postgres.ts";
import { generateTrip, DEFAULTS } from "../shared/planner.ts";

// CI supplies a disposable PostgreSQL database; never point this at production.
test(
  "PostgreSQL saves, reopens and deletes a trip snapshot",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const store = await openPostgresStore(process.env.TEST_DATABASE_URL!);
    let id: string | undefined;
    try {
      const trip = generateTrip(DEFAULTS);
      id = await store.save(trip);
      const other = await openPostgresStore(process.env.TEST_DATABASE_URL!);
      try {
        assert.deepEqual((await other.list()).find((t) => t.id === id)?.trip, trip);
      } finally {
        await other.close();
      }
      assert.equal(await store.delete(id), true);
      assert.equal(await store.delete(id), false);
    } finally {
      if (id) await store.delete(id);
      await store.close();
    }
  },
);
