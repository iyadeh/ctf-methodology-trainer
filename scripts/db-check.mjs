import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env.local and set local database credentials.",
  );
}

const sql = postgres(databaseUrl, {
  connect_timeout: 5,
  max: 1,
});

function formatConnectionError(error) {
  if (error instanceof AggregateError) {
    return error.errors
      .map((cause) => (cause instanceof Error ? cause.message : String(cause)))
      .filter(Boolean)
      .join("; ");
  }

  return error instanceof Error ? error.message : String(error);
}

try {
  await sql`select 1 as connected`;
  console.log("PostgreSQL connection verified.");
} catch (error) {
  console.error("PostgreSQL connection failed.", formatConnectionError(error));
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
