import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Trip } from "../shared/planner.ts";

type TripRow = { id: string; data: string; created_at: string };

/**
 * A single-user library stored in a local SQLite file.
 * No database server or cloud account is needed.
 */
export function openTripStore(filename: string) {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_trips_created ON trips(created_at)");

  const selectAll = db.prepare(
    "SELECT id, data, created_at FROM trips ORDER BY created_at DESC, id DESC",
  );
  const insert = db.prepare("INSERT INTO trips (id, data, created_at) VALUES (?, ?, ?)");
  const remove = db.prepare("DELETE FROM trips WHERE id = ?");

  return {
    kind: "sqlite" as const,
    list() {
      return (selectAll.all() as TripRow[]).map((row) => ({
        id: row.id,
        trip: JSON.parse(row.data) as Trip,
        createdAt: row.created_at,
      }));
    },
    save(trip: Trip) {
      const id = randomUUID();
      insert.run(id, JSON.stringify(trip), new Date().toISOString());
      return id;
    },
    delete(id: string) {
      return remove.run(id).changes > 0;
    },
    close() {
      db.close();
    },
  };
}

type SavedTrip = { id: string; trip: Trip; createdAt: string };
export interface TripStore {
  kind: "sqlite" | "postgresql";
  list(): SavedTrip[] | Promise<SavedTrip[]>;
  save(trip: Trip): string | Promise<string>;
  delete(id: string): boolean | Promise<boolean>;
  close(): void | Promise<void>;
}
