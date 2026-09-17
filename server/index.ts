import express from "express";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { openTripStore } from "./database.ts";
import { createApp } from "./app.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const databasePath = process.env.TABI_DB_PATH || resolve(root, "data/tabi.sqlite");
const store = process.env.DATABASE_URL
  ? await (await import("./postgres.ts")).openPostgresStore(process.env.DATABASE_URL)
  : openTripStore(databasePath);
const app = createApp(store);
const server = createServer(app);
const production = process.argv.includes("--production");

let vite: import("vite").ViteDevServer | undefined;
if (production) {
  app.use(express.static(resolve(root, "dist")));
  app.get("/", (_req, res) => res.sendFile(resolve(root, "dist/index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
      hmr: { server },
      watch: { usePolling: process.env.CODEX_SANDBOX === "seatbelt" },
    },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.get("/", async (req, res, next) => {
    try {
      const template = await readFile(resolve(root, "index.html"), "utf8");
      const html = await vite!.transformIndexHtml(req.originalUrl, template);
      res.type("html").send(html);
    } catch (error) {
      next(error);
    }
  });
}

server.on("error", async (error) => {
  console.error("Could not start the local server:", error.message);
  await vite?.close();
  await store.close();
  process.exit(1);
});
server.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log("\nTabi is running locally: http://127.0.0.1:" + port);
  console.log("Storage: " + store.kind + (store.kind === "sqlite" ? " · " + databasePath : ""));
  console.log("Press Ctrl+C to stop.\n");
});

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await vite?.close();
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  server.closeAllConnections();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
