import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import { tripSchema } from "../shared/validation.ts";
import { quizSchema, recommendTrips } from "../shared/recommendations.ts";
import type { TripStore } from "./database.ts";

/** Only loopback origins are allowed: this is a local, single-user app. */
function localHostname(hostname: string) {
  return ["127.0.0.1", "localhost", "[::1]"].includes(hostname);
}
export function createApp(store: TripStore) {
  const app = express();
  app.disable("x-powered-by");

  // Host checking also prevents DNS rebinding through a remote domain.
  app.use((req, res, next) => {
    if (!localHostname(req.hostname)) {
      res.status(403).json({ error: "This app only accepts local connections." });
      return;
    }
    const origin = req.get("origin");
    const expectedOrigin = req.protocol + "://" + req.get("host");
    if (origin && origin !== expectedOrigin) {
      res.status(403).json({ error: "Cross-origin requests are not allowed." });
      return;
    }
    if (req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Cross-site requests are not allowed." });
      return;
    }
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", storage: store.kind });
  });
  app.post("/api/recommendations", (req, res) => {
    const result = quizSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Please check your quiz answers." });
      return;
    }
    res.json({ recommendations: recommendTrips(result.data) });
  });
  app.get("/api/trips", async (_req, res) => {
    res.json({ trips: await store.list() });
  });
  app.post("/api/trips", async (req, res) => {
    const result = tripSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Please check your trip details." });
      return;
    }
    const id = await store.save(result.data);
    res.status(201).json({ id });
  });
  app.delete("/api/trips/:id", async (req, res) => {
    const result = z.string().uuid().safeParse(req.params.id);
    if (!result.success) {
      res.status(400).json({ error: "Invalid trip ID." });
      return;
    }
    if (!(await store.delete(result.data))) {
      res.status(404).json({ error: "Trip not found." });
      return;
    }
    res.json({ deleted: true });
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "The trip is too large." });
    } else if (error.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON." });
    } else {
      console.error("Local API error:", error);
      res.status(500).json({
        error: "Could not access the local trip library. Your current plan is still open.",
      });
    }
  };
  app.use(handleError);
  return app;
}
