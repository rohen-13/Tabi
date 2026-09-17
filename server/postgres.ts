import pg from "pg";
import { randomUUID } from "node:crypto";
import type { TripStore } from "./database.ts";
import type { Trip } from "../shared/planner.ts";

export async function openPostgresStore(connectionString: string): Promise<TripStore> {
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000 });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS trips (
      id UUID PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_trips_created ON trips(created_at)");
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    kind: "postgresql",
    async list() {
      const result = await pool.query<{ id: string; data: Trip; created_at: Date }>(
        "SELECT id,data,created_at FROM trips ORDER BY created_at DESC,id DESC",
      );
      return result.rows.map((row) => ({
        id: row.id,
        trip: row.data,
        createdAt: row.created_at.toISOString(),
      }));
    },
    async save(trip) {
      const id = randomUUID();
      await pool.query("INSERT INTO trips(id,data) VALUES ($1,$2)", [id, JSON.stringify(trip)]);
      return id;
    },
    async delete(id) {
      return (await pool.query("DELETE FROM trips WHERE id=$1", [id])).rowCount === 1;
    },
    async close() {
      await pool.end();
    },
  };
}
