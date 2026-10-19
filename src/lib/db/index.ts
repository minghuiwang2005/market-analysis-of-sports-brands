import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";
import * as schema from "@/lib/db/schema";

neonConfig.webSocketConstructor = WebSocket;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("Neon 数据库尚未配置。请在本地 .env.local 中设置 DATABASE_URL。");
    this.name = "DatabaseConfigurationError";
  }
}

function createDatabase(pool: Pool) {
  return drizzle({ client: pool, schema });
}

const globalForDatabase = globalThis as typeof globalThis & {
  fieldnotePool?: Pool;
  fieldnoteDatabase?: ReturnType<typeof createDatabase>;
};

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();

  if (!globalForDatabase.fieldnotePool || !globalForDatabase.fieldnoteDatabase) {
    const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 10_000 });
    globalForDatabase.fieldnotePool = pool;
    globalForDatabase.fieldnoteDatabase = createDatabase(pool);
  }

  return globalForDatabase.fieldnoteDatabase;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
