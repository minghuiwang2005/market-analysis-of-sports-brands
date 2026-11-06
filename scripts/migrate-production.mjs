import { lookup } from "node:dns/promises";
import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "Production migration cannot run: DATABASE_URL_UNPOOLED or DATABASE_URL is not configured.",
  );
  process.exit(1);
}

let hostname;
try {
  hostname = new URL(connectionString).hostname;
  const addresses = await lookup(hostname, { all: true });
  console.log(`Production database DNS resolved (${addresses.length} address(es)).`);
} catch (error) {
  console.error(
    "Production database DNS lookup failed:",
    error?.code ?? "UNKNOWN",
    error?.message ?? "Unknown DNS error",
  );
  process.exit(1);
}

neonConfig.webSocketConstructor = WebSocket;

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

try {
  await pool.query("select 1");
  console.log("Production database connection succeeded; applying migrations.");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Production database migrations completed.");
} catch (error) {
  const message = String(error?.message ?? "Unknown database migration error").replace(
    /postgres(?:ql)?:\/\/[^\s"']+/gi,
    "[REDACTED_DATABASE_URL]",
  );
  console.error("Production database migration failed:", {
    name: error?.name ?? "Error",
    code: error?.code ?? "UNKNOWN",
    message,
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
